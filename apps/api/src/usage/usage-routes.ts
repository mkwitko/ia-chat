import { monthOf, PLANS, PlanId, usageStatus } from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';

const PATH = '/api/usage';
const CAP_PATH = '/api/usage/cap';
const ENTITY = 'overage_cap';
const MONTH_KEY_LENGTH = 7; // YYYY-MM

const capSchema = z.object({ capCents: z.int().min(0).nullable() }).strict();

/** Spec 10, "Plano e uso": the month's conversations, overage and the owner's cap (E-18). */
export function registerUsageRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant(Permission.billingRead) }, readUsage);
  app.put(CAP_PATH, { preHandler: requireTenant(Permission.billingManage) }, saveCap);
}

async function readUsage(request: FastifyRequest) {
  const tenant = tenantOf(request);
  const month = monthOf(new Date());
  return tenant.withTenant(async (tx) => {
    const { plan, overageCapCents } = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: { plan: true, overageCapCents: true },
    });
    const counter = await tx.usageCounter.findUnique({
      where: { tenantId_month: { tenantId: tenant.tenantId, month } },
    });
    const conversations = counter?.conversations ?? 0;
    return {
      month: month.toISOString().slice(0, MONTH_KEY_LENGTH),
      plan,
      monthlyCents: PLANS[PlanId[plan]].monthlyCents,
      conversations,
      messagesByCategory: counter?.messagesByCategory ?? {},
      capCents: overageCapCents,
      ...usageStatus({ plan: PlanId[plan], conversations, capCents: overageCapCents }),
    };
  });
}

async function saveCap(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, capSchema);
  if (!input) return reply;
  const { tenant, body } = input;
  await tenant.withTenant(async (tx) => {
    const where = { id: tenant.tenantId };
    const before = await tx.tenant.findUniqueOrThrow({ where, select: { overageCapCents: true } });
    await tx.tenant.update({ where, data: { overageCapCents: body.capCents } });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: tenant.tenantId,
      action: AuditAction.update,
      before: { capCents: before.overageCapCents },
      after: { capCents: body.capCents },
    });
  });
  return body;
}
