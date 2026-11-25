import { applyPayment, markSubscriptionCancelled, TenantStatus } from '@app/db';
import type { BillingDeps } from './types.ts';

/** Tenants that hold a subscription (not cancelled), optionally just one. */
export function subscribedTenants(deps: BillingDeps) {
  return deps.db.client.tenant.findMany({
    where: {
      billingSubscriptionId: { not: null },
      status: { not: TenantStatus.cancelled },
      ...(deps.onlyTenantId ? { id: deps.onlyTenantId } : {}),
    },
    select: {
      id: true,
      plan: true,
      status: true,
      billingCustomerId: true,
      billingSubscriptionId: true,
      billingOverdueSince: true,
      billingNoticeStep: true,
      billingInvoiceUrl: true,
      billingOverageThrough: true,
    },
  });
}

/**
 * Spec 05: Asaas pauses a webhook queue after 15 failures in a row, so once a day we ask the
 * provider for every subscription's invoices and apply them, oldest first. Same function as the
 * webhook, so a missed event is only late, never lost.
 */
export async function reconcileTenant(deps: BillingDeps, subscriptionId: string): Promise<void> {
  const subscription = await deps.provider.getSubscription(subscriptionId);
  if (!subscription.active) {
    await markSubscriptionCancelled(deps.db.client, subscriptionId);
    return;
  }
  const payments = await deps.provider.listPayments(subscriptionId);
  payments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  for (const payment of payments) await applyPayment(deps.db.client, payment);
}
