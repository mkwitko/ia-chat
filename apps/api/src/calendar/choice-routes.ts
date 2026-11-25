import { CalendarAuthError, listOwnedCalendars, revokeToken, decryptToken } from '@app/core';
import { calendarAccessToken, googleClientOf, type ResolverOptions } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';

// E-21: after the consent the professional picks the calendar of the appointments (only calendars
// they own) or disconnects. No parallel sync: Google is the source of availability.

const ENTITY = 'calendar_integration';
const MAX_ID = 300;
const chooseSchema = z.object({ calendarId: z.string().trim().min(1).max(MAX_ID) }).strict();

export function registerCalendarChoiceRoutes(app: FastifyInstance, base: string): void {
  const manage = { preHandler: requireTenant(Permission.integrationsManage) };
  app.get(`${base}/calendars`, manage, calendars);
  app.put(`${base}/calendar`, manage, choose);
  app.delete(base, manage, disconnect);
}

/** Calendars the user owns, or null when the token is dead (the panel shows the reconnect banner). */
async function ownedOf(request: FastifyRequest, options: ResolverOptions) {
  const tenantId = tenantOf(request).tenantId;
  try {
    const token = await calendarAccessToken(options, tenantId);
    return token ? await listOwnedCalendars(token, options.fetch) : null;
  } catch (error) {
    if (error instanceof CalendarAuthError) return null;
    throw error;
  }
}

function off(reply: FastifyReply) {
  return reply.code(HttpStatus.unavailable).send({ error: ErrorCode.calendarOff });
}

async function calendars(request: FastifyRequest, reply: FastifyReply) {
  const { options } = request.server.calendar;
  if (!options) return off(reply);
  const owned = await ownedOf(request, options);
  if (!owned)
    return reply.code(HttpStatus.conflict).send({ error: ErrorCode.calendarNeedsReconnect });
  return { calendars: owned };
}

async function choose(request: FastifyRequest, reply: FastifyReply) {
  const { options } = request.server.calendar;
  const input = parsed(request, reply, chooseSchema);
  if (!options) return off(reply);
  if (!input) return reply;
  const owned = await ownedOf(request, options);
  const picked = owned?.find((one) => one.id === input.body.calendarId);
  if (!picked) return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  await input.tenant.withTenant(async (tx) => {
    const row = await tx.calendarIntegration.update({
      where: { tenantId: input.tenant.tenantId },
      data: { calendarId: picked.id, calendarName: picked.name },
    });
    await audit(tx, input.tenant, { entity: ENTITY, entityId: row.id, action: AuditAction.update });
  });
  return { calendarName: picked.name };
}

async function disconnect(request: FastifyRequest, reply: FastifyReply) {
  const { options } = request.server.calendar;
  if (!options) return off(reply);
  const tenant = tenantOf(request);
  const row = await tenant.withTenant((tx) => tx.calendarIntegration.findFirst());
  if (!row) return reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
  await revokeToken(
    googleClientOf(options),
    decryptToken(row.refreshTokenEnc, options.config.tokenKey),
  );
  await tenant.withTenant(async (tx) => {
    await tx.calendarIntegration.delete({ where: { id: row.id } });
    await audit(tx, tenant, { entity: ENTITY, entityId: row.id, action: AuditAction.archive });
  });
  return reply.code(HttpStatus.ok).send({});
}
