import { ActorType, Autonomy, IdentityMode } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';

export const SETTINGS_PATH = '/api/assistant/settings';

const AUDIT_ENTITY = 'assistant_settings';
const AUDIT_ACTION = 'update';
const MAX_NAME = 40;
const FIELDS = { autonomy: true, identityMode: true, assistantName: true } as const;

const bodySchema = z
  .object({
    autonomy: z.enum(Autonomy),
    identityMode: z.enum(IdentityMode),
    assistantName: z.string().trim().min(1).max(MAX_NAME),
  })
  .strict();

/** Spec 10, "Assistente": autonomy (RF-13), identity (spec 01) and the assistant's name. */
export function registerAssistantSettingsRoutes(app: FastifyInstance): void {
  app.get(SETTINGS_PATH, { preHandler: requireTenant(Permission.assistantRead) }, readSettings);
  app.put(SETTINGS_PATH, { preHandler: requireTenant(Permission.assistantManage) }, saveSettings);
}

async function readSettings(request: FastifyRequest, reply: FastifyReply) {
  const tenant = request.tenant;
  if (!tenant) return reply.code(HttpStatus.forbidden).send({ error: ErrorCode.forbidden });
  return tenant.withTenant(async (tx) => {
    const { name, ...settings } = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: { ...FIELDS, name: true },
    });
    // Same fallback as the agent: the first professional, else the tenant (preview only).
    const professional = await tx.professional.findFirst({ orderBy: { createdAt: 'asc' } });
    return { ...settings, professionalName: professional?.name ?? name };
  });
}

async function saveSettings(request: FastifyRequest, reply: FastifyReply) {
  const body = bodySchema.safeParse(request.body);
  const tenant = request.tenant;
  if (!body.success || !tenant)
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  return tenant.withTenant(async (tx) => {
    const where = { id: tenant.tenantId };
    const before = await tx.tenant.findUniqueOrThrow({ where, select: FIELDS });
    const after = await tx.tenant.update({ where, data: body.data, select: FIELDS });
    await tx.auditLog.create({
      data: {
        tenantId: tenant.tenantId,
        actorType: ActorType.user,
        actorId: tenant.userId,
        action: AUDIT_ACTION,
        entity: AUDIT_ENTITY,
        entityId: tenant.tenantId,
        before,
        after,
      },
    });
    return after;
  });
}
