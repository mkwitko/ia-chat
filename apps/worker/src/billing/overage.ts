import { dateKey, fromDateKey, overageOf, PlanId, previousMonth } from '@app/core';
import { monthLabel } from './month-label.ts';
import type { BillingDeps } from './types.ts';
import type { subscribedTenants } from './reconcile.ts';

type SubscribedTenant = Awaited<ReturnType<typeof subscribedTenants>>[number];

/**
 * Spec 05: the overage of the month that just closed is computed here and charged as its own
 * item, due on the date of the next subscription invoice. `billingOverageThrough` moves only
 * after the provider accepted the charge, so a failure is retried tomorrow.
 * ponytail: a crash between the charge and that update would charge the month twice; the
 * charge carries `overage:<tenant>:<month>` as reference so the operator can spot it.
 */
export async function chargeOverage(deps: BillingDeps, tenant: SubscribedTenant): Promise<boolean> {
  const month = previousMonth(deps.now);
  const done = tenant.billingOverageThrough;
  if (done && done >= month) return false;
  if (!tenant.billingCustomerId || !tenant.billingSubscriptionId) return false;
  const counter = await deps.db.withTenant(tenant.id, (tx) =>
    tx.usageCounter.findUnique({ where: { tenantId_month: { tenantId: tenant.id, month } } }),
  );
  const cents = overageOf(PlanId[tenant.plan], counter?.conversations ?? 0);
  if (cents > 0) {
    const subscription = await deps.provider.getSubscription(tenant.billingSubscriptionId);
    await deps.provider.createCharge({
      customerId: tenant.billingCustomerId,
      cents,
      dueDate: subscription.nextDueDate ?? dateKey(deps.now),
      description: `Excedente de conversas de ${monthLabel(month)}`,
      reference: `overage:${tenant.id}:${dateKey(month)}`,
    });
  }
  await deps.db.client.tenant.update({
    where: { id: tenant.id },
    data: { billingOverageThrough: fromDateKey(dateKey(month)) },
  });
  return cents > 0;
}
