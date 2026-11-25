import { PLANS, type BillingProvider } from '@app/core';
import { TenantStatus } from '@app/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';
import { fail, providerFailed } from './failures.ts';
import { ENTITY, planBody } from './subscribe.ts';

const subscriptionOf = (request: FastifyRequest) => {
  const tenant = tenantOf(request);
  return tenant.withTenant((tx) =>
    tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: { plan: true, billingSubscriptionId: true },
    }),
  );
};

/** The new price applies from the next invoice (hypothesis: no proration); the franchise at once. */
export async function changePlan(
  request: FastifyRequest,
  reply: FastifyReply,
  provider: BillingProvider,
) {
  const input = parsed(request, reply, planBody);
  if (!input) return reply;
  const { tenant, body } = input;
  const row = await subscriptionOf(request);
  if (!row.billingSubscriptionId) return fail(reply, HttpStatus.conflict, ErrorCode.noSubscription);
  try {
    const cents = PLANS[body.plan].monthlyCents;
    await provider.updateSubscriptionValue(row.billingSubscriptionId, cents);
  } catch (error) {
    return providerFailed(request, reply, error);
  }
  await tenant.withTenant(async (tx) => {
    await tx.tenant.update({ where: { id: tenant.tenantId }, data: { plan: body.plan } });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: tenant.tenantId,
      action: AuditAction.update,
      before: { plan: row.plan },
      after: { plan: body.plan },
    });
  });
  return { ok: true };
}

/** Cancelled by the customer: the subscription ends at once and so does the assistant (hypothesis). */
export async function cancelSubscription(
  request: FastifyRequest,
  reply: FastifyReply,
  provider: BillingProvider,
) {
  const tenant = tenantOf(request);
  const row = await subscriptionOf(request);
  if (!row.billingSubscriptionId) return fail(reply, HttpStatus.conflict, ErrorCode.noSubscription);
  try {
    await provider.cancelSubscription(row.billingSubscriptionId);
  } catch (error) {
    return providerFailed(request, reply, error);
  }
  await tenant.withTenant(async (tx) => {
    await tx.tenant.update({
      where: { id: tenant.tenantId },
      data: {
        status: TenantStatus.cancelled,
        billingSubscriptionId: null,
        billingOverdueSince: null,
        billingNoticeStep: 0,
        billingInvoiceUrl: null,
      },
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: tenant.tenantId,
      action: AuditAction.archive,
    });
  });
  return { ok: true };
}
