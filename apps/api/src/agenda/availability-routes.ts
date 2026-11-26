import { MINUTES_PER_DAY, MS_PER_MINUTE } from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, parsed, tenantOf } from '../setup/guarded.ts';
import {
  endMinuteOfColumn,
  minuteOfColumn,
  minutesOf,
  professionalOf,
  professionalQuery,
  timeOf,
  timeSchema,
} from './schemas.ts';

// RF-40: weekly windows per day, more than one per day, per professional (spec 05, "Agenda por
// profissional"; without `professionalId`, the first one). RF-15: the nightly push time.

const PATH = '/api/availability';
const SUMMARY_PATH = '/api/agenda/summary-time';
const ENTITY = 'availability';
const TENANT_ENTITY = 'tenant_agenda';
const LAST_WEEKDAY = 6;
const MAX_RULES = 28;

const ruleSchema = z.object({
  weekday: z.int().min(0).max(LAST_WEEKDAY),
  start: timeSchema,
  end: timeSchema,
});
export type RuleInput = z.infer<typeof ruleSchema>;

/** Each window ends after it starts and the windows of one weekday do not overlap. */
export function validWindows(rules: readonly RuleInput[]): boolean {
  const sorted = rules.toSorted(
    (a, b) => a.weekday - b.weekday || minutesOf(a.start) - minutesOf(b.start),
  );
  return sorted.every((rule, index) => {
    if (minutesOf(rule.start) >= minutesOf(rule.end)) return false;
    const next = sorted[index + 1];
    return !(next?.weekday === rule.weekday && minutesOf(next.start) < minutesOf(rule.end));
  });
}

const putSchema = z
  .object({ rules: z.array(ruleSchema).max(MAX_RULES), professionalId: z.uuid().optional() })
  .strict()
  .refine((body) => validWindows(body.rules));
const summarySchema = z
  .object({
    minute: z
      .int()
      .min(0)
      .max(MINUTES_PER_DAY - 1),
  })
  .strict();

export function registerAvailabilityRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant(Permission.agendaRead) }, readAvailability);
  const manage = { preHandler: requireTenant(Permission.agendaManage) };
  app.put(PATH, manage, replaceRules);
  app.put(SUMMARY_PATH, manage, saveSummaryTime);
}

const at = (minute: number) => new Date(minute * MS_PER_MINUTE);

function readAvailability(request: FastifyRequest, reply: FastifyReply) {
  const query = professionalQuery.safeParse(request.query);
  if (!query.success) return notFound(reply);
  const { tenantId } = tenantOf(request);
  return tenantOf(request).withTenant(async (tx) => {
    const professional = await professionalOf(tx, query.data.professionalId);
    if (query.data.professionalId && !professional) return notFound(reply);
    const [tenant, rules] = await Promise.all([
      tx.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { timezone: true, nightlySummaryMinute: true },
      }),
      professional
        ? tx.availabilityRule.findMany({
            where: { professionalId: professional.id },
            orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
          })
        : [],
    ]);
    return {
      timezone: tenant.timezone,
      nightlySummaryMinute: tenant.nightlySummaryMinute,
      professionalId: professional?.id ?? null,
      rules: rules.map((rule) => ({
        weekday: rule.weekday,
        start: timeOf(minuteOfColumn(rule.startTime)),
        end: timeOf(endMinuteOfColumn(rule.endTime)),
      })),
    };
  });
}

async function replaceRules(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, putSchema);
  if (!input) return reply;
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    const professional = await professionalOf(tx, body.professionalId);
    if (!professional) return notFound(reply);
    const mine = { professionalId: professional.id };
    const before = await tx.availabilityRule.findMany({ where: mine, select: { weekday: true } });
    await tx.availabilityRule.deleteMany({ where: mine });
    await tx.availabilityRule.createMany({
      data: body.rules.map((rule) => ({
        tenantId: tenant.tenantId,
        professionalId: professional.id,
        weekday: rule.weekday,
        startTime: at(minutesOf(rule.start)),
        endTime: at(minutesOf(rule.end) % MINUTES_PER_DAY),
      })),
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: professional.id,
      action: AuditAction.update,
      before: { windows: before.length },
      after: { windows: body.rules.length },
    });
    return { rules: body.rules };
  });
}

async function saveSummaryTime(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, summarySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    const before = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: { nightlySummaryMinute: true },
    });
    await tx.tenant.update({
      where: { id: tenant.tenantId },
      data: { nightlySummaryMinute: body.minute },
    });
    await audit(tx, tenant, {
      entity: TENANT_ENTITY,
      entityId: tenant.tenantId,
      action: AuditAction.update,
      before,
      after: { nightlySummaryMinute: body.minute },
    });
    return { nightlySummaryMinute: body.minute };
  });
}
