import { parsePolicy } from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { HttpStatus } from '../http.ts';
import { audit, AuditAction } from './audit.ts';
import { notFound, parsed, tenantOf } from './guarded.ts';

// Spec 10, "Serviços e local": services with duration and price (cents, RN money rule).

const PATH = '/api/services';
const ITEM_PATH = '/api/services/:id';
const ENTITY = 'service';
const MAX_NAME = 80;
const MAX_MINUTES = 600;
const SELECT = {
  id: true,
  name: true,
  durationMinutes: true,
  priceCents: true,
  visibleToPatient: true,
} as const;

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_NAME),
    durationMinutes: z.int().positive().max(MAX_MINUTES),
    priceCents: z.int().nonnegative(),
    visibleToPatient: z.boolean(),
  })
  .strict();
const paramsSchema = z.object({ id: z.uuid() });

export function registerServiceRoutes(app: FastifyInstance): void {
  const read = { preHandler: requireTenant(Permission.assistantRead) };
  const manage = { preHandler: requireTenant(Permission.assistantManage) };
  app.get(PATH, read, listServices);
  app.post(PATH, manage, createService);
  app.put(ITEM_PATH, manage, updateService);
  app.delete(ITEM_PATH, manage, archiveService);
}

function listServices(request: FastifyRequest) {
  return tenantOf(request).withTenant(async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantOf(request).tenantId },
      select: { specialtyPolicy: { select: { rules: true } } },
    });
    const services = await tx.service.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: SELECT,
    });
    return {
      pricesForbidden: parsePolicy(tenant.specialtyPolicy?.rules).pricesForbidden,
      services,
    };
  });
}

async function createService(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const service = await tenant.withTenant(async (tx) => {
    const created = await tx.service.create({
      data: { ...body, tenantId: tenant.tenantId },
      select: SELECT,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: created.id,
      action: AuditAction.create,
      after: created,
    });
    return created;
  });
  return reply.code(HttpStatus.created).send(service);
}

async function updateService(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  const params = paramsSchema.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  const where = { id: params.data.id, active: true };
  const service = await tenant.withTenant(async (tx) => {
    // RLS: another tenant's service is simply not found.
    const before = await tx.service.findFirst({ where, select: SELECT });
    if (!before) return null;
    const after = await tx.service.update({ where: { id: before.id }, data: body, select: SELECT });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: before.id,
      action: AuditAction.update,
      before,
      after,
    });
    return after;
  });
  return service ?? notFound(reply);
}

async function archiveService(request: FastifyRequest, reply: FastifyReply) {
  const params = paramsSchema.safeParse(request.params);
  if (!params.success) return notFound(reply);
  const tenant = tenantOf(request);
  const archived = await tenant.withTenant(async (tx) => {
    const before = await tx.service.findFirst({
      where: { id: params.data.id, active: true },
      select: SELECT,
    });
    if (!before) return false;
    // Archived, not deleted: past appointments still point to it.
    await tx.service.update({ where: { id: before.id }, data: { active: false } });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: before.id,
      action: AuditAction.archive,
      before,
    });
    return true;
  });
  return archived ? { ok: true } : notFound(reply);
}
