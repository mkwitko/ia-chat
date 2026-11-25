import { PLANS, PlanId, trialView, type BillingProvider } from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { tenantOf } from '../setup/guarded.ts';
import { cancelSubscription, changePlan } from './manage.ts';
import { subscribe } from './subscribe.ts';

const PATH = '/api/billing';
const SUBSCRIPTION_PATH = '/api/billing/subscription';
const PLAN_PATH = '/api/billing/plan';

/** Spec 10, "Assinatura": see the plan, subscribe, change plan, cancel. Off without a provider. */
export function registerBillingRoutes(
  app: FastifyInstance,
  provider: BillingProvider | undefined,
): void {
  const off = (reply: FastifyReply) =>
    reply.code(HttpStatus.unavailable).send({ error: ErrorCode.billingOff });
  const manage = { preHandler: requireTenant(Permission.billingManage) };
  app.get(PATH, { preHandler: requireTenant(Permission.billingRead) }, (request) =>
    readBilling(request, provider !== undefined),
  );
  app.post(SUBSCRIPTION_PATH, manage, (request, reply) =>
    provider ? subscribe(request, reply, provider) : off(reply),
  );
  app.put(PLAN_PATH, manage, (request, reply) =>
    provider ? changePlan(request, reply, provider) : off(reply),
  );
  app.delete(SUBSCRIPTION_PATH, manage, (request, reply) =>
    provider ? cancelSubscription(request, reply, provider) : off(reply),
  );
}

function readBilling(request: FastifyRequest, enabled: boolean) {
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    const row = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: {
        plan: true,
        status: true,
        trialEndsAt: true,
        trialEndedAt: true,
        document: true,
        billingSubscriptionId: true,
        billingOverdueSince: true,
        billingInvoiceUrl: true,
        billingEndsAt: true,
      },
    });
    return {
      enabled,
      plan: row.plan,
      status: row.status,
      subscribed: row.billingSubscriptionId !== null,
      documentSet: row.document !== null,
      overdueSince: row.billingOverdueSince,
      invoiceUrl: row.billingInvoiceUrl,
      endsAt: row.billingEndsAt,
      trial: trialView({ ...row, now: new Date() }),
      plans: Object.values(PlanId).map((id) => ({ id, ...PLANS[id] })),
    };
  });
}
