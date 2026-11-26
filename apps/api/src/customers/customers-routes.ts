import {
  ConsentActor,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  ContactOrigin,
  LostReason,
  ManualStageError,
  PipelineStage,
  recordConsent,
  setManualStage,
} from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, parsed, tenantOf } from '../setup/guarded.ts';
import { listCustomers, readCustomer } from './customers-view.ts';
import { registerPackageRoutes } from './packages-routes.ts';

// Spec 10, "Clientes". Reading is for any member; changing needs the agenda-booking permission.

const PATH = '/api/customers';
const ITEM_PATH = '/api/customers/:id';
const ENTITY = 'contact';
const MAX_QUERY = 80;
const MAX_NAME = 120;
const MAX_REF = 60;

const idParams = z.object({ id: z.uuid() });
const listQuery = z.object({
  q: z.string().trim().max(MAX_QUERY).default(''),
  stage: z.enum(PipelineStage).optional(),
});
const editSchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_NAME).optional(),
    origin: z.enum(ContactOrigin).optional(),
    originRef: z.string().trim().max(MAX_REF).nullable().optional(),
  })
  .strict();
/** Only "perdido" is set by hand; `stage: null` returns to the automatic status. */
const stageSchema = z
  .object({
    stage: z.literal(PipelineStage.lost).nullable(),
    lostReason: z.enum(LostReason).optional(),
  })
  .strict();
// Only the client brings consent back (by writing "voltar"); the owner can only record an opt-out.
const consentSchema = z.object({ kind: z.literal(ConsentKind.opt_out) }).strict();

export function registerCustomerRoutes(app: FastifyInstance): void {
  const read = { preHandler: requireTenant() };
  const change = { preHandler: requireTenant(Permission.agendaBook) };
  app.get(PATH, read, list);
  app.get(ITEM_PATH, read, detail);
  app.patch(ITEM_PATH, change, edit);
  app.post(`${ITEM_PATH}/stage`, change, setStage);
  app.post(`${ITEM_PATH}/consent`, change, setConsent);
  registerPackageRoutes(app);
}

function list(request: FastifyRequest, reply: FastifyReply) {
  const query = listQuery.safeParse(request.query);
  if (!query.success)
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  const now = new Date();
  return tenantOf(request).withTenant((tx) => listCustomers(tx, { ...query.data, now }));
}

async function detail(request: FastifyRequest, reply: FastifyReply) {
  const params = idParams.safeParse(request.params);
  if (!params.success) return notFound(reply);
  const found = await tenantOf(request).withTenant((tx) =>
    readCustomer(tx, params.data.id, new Date()),
  );
  return found ?? notFound(reply);
}

async function edit(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, editSchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  const changed = await tenant.withTenant(async (tx) => {
    const before = await tx.contact.findUnique({
      where: { id: params.data.id },
      select: { name: true, origin: true, originRef: true },
    });
    if (!before) return false;
    await tx.contact.update({
      where: { id: params.data.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.origin ? { origin: body.origin } : {}),
        ...(body.originRef === undefined ? {} : { originRef: body.originRef }),
      },
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: params.data.id,
      action: AuditAction.update,
      before,
      after: { ...before, ...body },
    });
    return true;
  });
  return changed ? { updated: true } : notFound(reply);
}

async function setStage(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, stageSchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  const result = await tenant.withTenant(async (tx) => {
    const done = await setManualStage(tx, {
      tenantId: tenant.tenantId,
      contactId: params.data.id,
      userId: tenant.userId,
      now: new Date(),
      ...body,
    });
    if (done !== null && done !== ManualStageError.lostNeedsReason)
      await audit(tx, tenant, {
        entity: ENTITY,
        entityId: params.data.id,
        action: AuditAction.update,
        after: { stage: body.stage, lostReason: body.lostReason ?? null },
      });
    return done;
  });
  if (result === null) return notFound(reply);
  if (result === ManualStageError.lostNeedsReason)
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  return { stage: result };
}

async function setConsent(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, consentSchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  const done = await tenant.withTenant(async (tx) => {
    const recorded = await recordConsent(tx, {
      tenantId: tenant.tenantId,
      contactId: params.data.id,
      kind: body.kind,
      category: ConsentCategory.all,
      source: ConsentSource.owner_panel,
      actor: { type: ConsentActor.user, id: tenant.userId },
      now: new Date(),
    });
    if (recorded)
      await audit(tx, tenant, {
        entity: ENTITY,
        entityId: params.data.id,
        action: AuditAction.update,
        after: { consent: body.kind },
      });
    return recorded;
  });
  return done ? { recorded: true } : notFound(reply);
}
