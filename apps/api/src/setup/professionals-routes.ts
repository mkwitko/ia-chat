import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from './audit.ts';
import { notFound, parsed, tenantOf } from './guarded.ts';

// M-04: who serves in the business. The first professional owns the agenda the assistant books;
// the others are named to the client and handed off (docs/research/09, feature #16).

const PATH = '/api/professionals';
const ITEM_PATH = '/api/professionals/:id';
const ENTITY = 'professional';
const MAX_NAME = 120;
const SELECT = { id: true, name: true } as const;
const FIRST = { orderBy: { createdAt: 'asc' }, select: SELECT } as const;

const bodySchema = z.object({ name: z.string().trim().min(1).max(MAX_NAME) }).strict();
const idParams = z.object({ id: z.uuid() });

export function registerProfessionalRoutes(app: FastifyInstance): void {
  const manage = { preHandler: requireTenant(Permission.assistantManage) };
  app.get(PATH, { preHandler: requireTenant(Permission.assistantRead) }, (request) =>
    tenantOf(request)
      .withTenant((tx) => tx.professional.findMany(FIRST))
      .then((professionals) => ({ professionals })),
  );
  app.post(PATH, manage, addProfessional);
  app.put(ITEM_PATH, manage, renameProfessional);
  app.delete(ITEM_PATH, manage, removeProfessional);
}

async function addProfessional(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const created = await tenant.withTenant(async (tx) => {
    const row = await tx.professional.create({
      data: { name: body.name, tenantId: tenant.tenantId },
      select: SELECT,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: row.id,
      action: AuditAction.create,
      after: body,
    });
    return row;
  });
  return reply.code(HttpStatus.created).send(created);
}

async function renameProfessional(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    const before = await tx.professional.findUnique({
      where: { id: params.data.id },
      select: SELECT,
    });
    if (!before) return notFound(reply);
    const after = await tx.professional.update({
      where: { id: before.id },
      data: body,
      select: SELECT,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: before.id,
      action: AuditAction.update,
      before,
      after: body,
    });
    return after;
  });
}

async function removeProfessional(request: FastifyRequest, reply: FastifyReply) {
  const params = idParams.safeParse(request.params);
  if (!params.success) return notFound(reply);
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    const first = await tx.professional.findFirst(FIRST);
    const before = await tx.professional.findUnique({
      where: { id: params.data.id },
      select: SELECT,
    });
    if (!before) return notFound(reply);
    const used =
      before.id === first?.id ||
      (await tx.appointment.count({ where: { professionalId: before.id } })) > 0 ||
      (await tx.availabilityRule.count({ where: { professionalId: before.id } })) > 0;
    if (used) return reply.code(HttpStatus.conflict).send({ error: ErrorCode.inUse });
    await tx.timeOff.deleteMany({ where: { professionalId: before.id } });
    await tx.professional.delete({ where: { id: before.id } });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: before.id,
      action: AuditAction.archive,
      before,
    });
    return { ok: true };
  });
}
