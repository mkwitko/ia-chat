import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from './audit.ts';
import { notFound, parsed, tenantOf } from './guarded.ts';

// M-04: every place where the business serves. The first one is the main address
// (`/api/location` edits it); the assistant states all of them.

const PATH = '/api/locations';
const ITEM_PATH = '/api/locations/:id';
const ENTITY = 'location';
const MAX_NAME = 80;
const MAX_ADDRESS = 300;
const MAX_ARRIVAL = 1000;
const SELECT = { id: true, name: true, address: true, arrivalInstructions: true } as const;

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_NAME),
    address: z.string().trim().min(1).max(MAX_ADDRESS),
    arrivalInstructions: z.string().trim().max(MAX_ARRIVAL).nullable().optional(),
  })
  .strict();
const idParams = z.object({ id: z.uuid() });

export function registerPlacesRoutes(app: FastifyInstance): void {
  const manage = { preHandler: requireTenant(Permission.assistantManage) };
  app.get(PATH, { preHandler: requireTenant(Permission.assistantRead) }, (request) =>
    tenantOf(request)
      .withTenant((tx) => tx.location.findMany({ orderBy: { createdAt: 'asc' }, select: SELECT }))
      .then((locations) => ({ locations })),
  );
  app.post(PATH, manage, createPlace);
  app.put(ITEM_PATH, manage, updatePlace);
  app.delete(ITEM_PATH, manage, removePlace);
}

const dataOf = (body: z.infer<typeof bodySchema>) => ({
  ...body,
  arrivalInstructions: body.arrivalInstructions?.length ? body.arrivalInstructions : null,
});

async function createPlace(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const created = await tenant.withTenant(async (tx) => {
    const row = await tx.location.create({
      data: { ...dataOf(body), tenantId: tenant.tenantId },
      select: SELECT,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: row.id,
      action: AuditAction.create,
      after: dataOf(body),
    });
    return row;
  });
  return reply.code(HttpStatus.created).send(created);
}

async function updatePlace(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    const before = await tx.location.findUnique({ where: { id: params.data.id }, select: SELECT });
    if (!before) return notFound(reply);
    const after = await tx.location.update({
      where: { id: before.id },
      data: dataOf(body),
      select: SELECT,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: before.id,
      action: AuditAction.update,
      before,
      after: dataOf(body),
    });
    return after;
  });
}

async function removePlace(request: FastifyRequest, reply: FastifyReply) {
  const params = idParams.safeParse(request.params);
  if (!params.success) return notFound(reply);
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    const before = await tx.location.findUnique({ where: { id: params.data.id }, select: SELECT });
    if (!before) return notFound(reply);
    // Appointments keep their place (onDelete: Restrict): a place in use stays.
    if ((await tx.appointment.count({ where: { locationId: before.id } })) > 0)
      return reply.code(HttpStatus.conflict).send({ error: ErrorCode.inUse });
    await tx.location.delete({ where: { id: before.id } });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: before.id,
      action: AuditAction.archive,
      before,
    });
    return { ok: true };
  });
}
