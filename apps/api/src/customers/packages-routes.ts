import { parseBusinessProfile } from '@app/core';
import {
  adjustPackage,
  contactPackages,
  MANUAL_REASONS,
  PackageError,
  registerPackage,
} from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, parsed, tenantOf } from '../setup/guarded.ts';

// Research 09 #7: the client's session packages on the client page. Reading is for any member;
// recording and adjusting need the agenda-booking permission, and both are audited.

const PATH = '/api/customers/:id/packages';
const ADJUST_PATH = '/api/customers/:id/packages/:packageId/adjust';
const ENTITY = 'client_package';
const MAX_NAME = 80;
const MAX_SESSIONS = 100;

const idParams = z.object({ id: z.uuid() });
const adjustParams = z.object({ id: z.uuid(), packageId: z.uuid() });
const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_NAME),
    sessions: z.int().min(1).max(MAX_SESSIONS),
    priceCents: z.int().min(0),
    purchasedOn: z.iso.date(),
    paid: z.boolean(),
  })
  .strict();
const adjustSchema = z
  .object({ delta: z.union([z.literal(1), z.literal(-1)]), reason: z.enum(MANUAL_REASONS) })
  .strict();

export function registerPackageRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant() }, list);
  const change = { preHandler: requireTenant(Permission.agendaBook) };
  app.post(PATH, change, create);
  app.post(ADJUST_PATH, change, adjust);
}

/** The client's packages and the profile packages that can be recorded (those with sessions). */
async function list(request: FastifyRequest, reply: FastifyReply) {
  const params = idParams.safeParse(request.params);
  if (!params.success) return notFound(reply);
  const tenant = tenantOf(request);
  const found = await tenant.withTenant(async (tx) => {
    const contact = await tx.contact.findUnique({ where: { id: params.data.id } });
    if (!contact) return null;
    const row = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: { businessProfile: true },
    });
    const offered = parseBusinessProfile(row.businessProfile).packages;
    return {
      packages: await contactPackages(tx, contact.id),
      options: offered.filter((item) => item.sessions !== undefined),
    };
  });
  return found ?? notFound(reply);
}

async function create(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, registerSchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  const created = await tenant.withTenant(async (tx) => {
    const contact = await tx.contact.findUnique({ where: { id: params.data.id } });
    if (!contact) return null;
    const row = await registerPackage(tx, {
      tenantId: tenant.tenantId,
      contactId: contact.id,
      ...body,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: row.id,
      action: AuditAction.create,
      after: { contactId: contact.id, ...body },
    });
    return { id: row.id };
  });
  return created ?? notFound(reply);
}

async function adjust(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, adjustSchema);
  const params = adjustParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  const { id: contactId, packageId } = params.data;
  const result = await tenant.withTenant(async (tx) => {
    const owned = await tx.clientPackage.findFirst({ where: { id: packageId, contactId } });
    if (!owned) return { ok: false, error: PackageError.notFound } as const;
    const done = await adjustPackage(tx, { packageId, ...body, actorId: tenant.userId });
    if (done.ok)
      await audit(tx, tenant, {
        entity: ENTITY,
        entityId: packageId,
        action: AuditAction.update,
        after: { adjust: body.delta, reason: body.reason, used: done.used },
      });
    return done;
  });
  if (result.ok) return { used: result.used };
  if (result.error === PackageError.notFound) return notFound(reply);
  return reply.code(HttpStatus.conflict).send({ error: result.error });
}
