import { addDays, zonedToUtc } from '@app/core';
import { AppointmentStatus, TimeOffKind, type Tx } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant, type TenantContext } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, parsed, tenantOf } from '../setup/guarded.ts';
import { daySchema, idParams, minutesOf, timeSchema, toLocalDate } from './schemas.ts';

// RF-41 (blocks and holidays) and RF-14 (vacation): both are time offs that `availableSlots`
// already subtracts. A vacation is whole days; a block may cover part of one day.

const PATH = '/api/time-offs';
const ITEM_PATH = '/api/time-offs/:id';
const ENTITY = 'time_off';
const MAX_REASON = 120;
const DAY_START = '00:00';
const SELECT = { id: true, kind: true, startsAt: true, endsAt: true, reason: true } as const;

const bodySchema = z
  .object({
    kind: z.enum(Object.values(TimeOffKind)),
    fromDay: daySchema,
    /** Last day, included. */
    toDay: daySchema,
    fromTime: timeSchema.optional(),
    toTime: timeSchema.optional(),
    reason: z.string().trim().max(MAX_REASON).nullable().default(null),
  })
  .strict()
  .refine((body) => body.toDay >= body.fromDay)
  .refine((body) => body.kind === TimeOffKind.block || (!body.fromTime && !body.toTime));

export function registerTimeOffRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant(Permission.agendaRead) }, listTimeOffs);
  const manage = { preHandler: requireTenant(Permission.agendaManage) };
  app.post(PATH, manage, createTimeOff);
  app.delete(ITEM_PATH, manage, removeTimeOff);
}

/** Upcoming and current ones; past blocks are history the panel does not need. */
function listTimeOffs(request: FastifyRequest) {
  return tenantOf(request).withTenant(async (tx) => ({
    timeOffs: await tx.timeOff.findMany({
      where: { endsAt: { gt: new Date() } },
      orderBy: { startsAt: 'asc' },
      select: SELECT,
    }),
  }));
}

type Body = z.infer<typeof bodySchema>;

/** The period in UTC: whole days, or the clock times of a block (tenant's wall clock). */
function periodOf(body: Body, timezone: string) {
  const startsAt = zonedToUtc(
    toLocalDate(body.fromDay),
    minutesOf(body.fromTime ?? DAY_START),
    timezone,
  );
  const endsAt = body.toTime
    ? zonedToUtc(toLocalDate(body.toDay), minutesOf(body.toTime), timezone)
    : zonedToUtc(addDays(toLocalDate(body.toDay), 1), 0, timezone);
  return { startsAt, endsAt };
}

async function insertTimeOff(tx: Tx, tenant: TenantContext, body: Body) {
  const professional = await tx.professional.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });
  const { timezone } = await tx.tenant.findUniqueOrThrow({
    where: { id: tenant.tenantId },
    select: { timezone: true },
  });
  const period = periodOf(body, timezone);
  if (period.endsAt <= period.startsAt) return null;
  const row = await tx.timeOff.create({
    data: {
      tenantId: tenant.tenantId,
      professionalId: professional.id,
      kind: body.kind,
      reason: body.reason,
      ...period,
    },
    select: SELECT,
  });
  // The panel warns: existing appointments inside the period are not cancelled by it.
  const conflicts = await tx.appointment.count({
    where: {
      status: { not: AppointmentStatus.cancelled },
      startsAt: { lt: period.endsAt },
      endsAt: { gt: period.startsAt },
    },
  });
  await audit(tx, tenant, {
    entity: ENTITY,
    entityId: row.id,
    action: AuditAction.create,
    after: row,
  });
  return { ...row, conflicts };
}

async function createTimeOff(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const created = await tenant.withTenant((tx) => insertTimeOff(tx, tenant, body));
  if (!created) return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  return reply.code(HttpStatus.created).send(created);
}

async function removeTimeOff(request: FastifyRequest, reply: FastifyReply) {
  const params = idParams.safeParse(request.params);
  if (!params.success) return notFound(reply);
  const tenant = tenantOf(request);
  const removed = await tenant.withTenant(async (tx) => {
    const before = await tx.timeOff.findFirst({ where: { id: params.data.id }, select: SELECT });
    if (!before) return false;
    await tx.timeOff.delete({ where: { id: before.id } });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: before.id,
      action: AuditAction.archive,
      before,
    });
    return true;
  });
  return removed ? { ok: true } : notFound(reply);
}
