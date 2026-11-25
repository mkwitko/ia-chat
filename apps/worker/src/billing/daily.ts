import { AlertEvent } from '@app/observability';
import { climbLadder } from './ladder.ts';
import { chargeOverage } from './overage.ts';
import { reconcileTenant, subscribedTenants } from './reconcile.ts';
import type { BillingDeps, BillingResult } from './types.ts';

const BILLING_FAILED = 'billing_daily';

/**
 * E-25, once a day: reconcile every subscription with Asaas, climb the overdue ladder, charge the
 * closed month's overage. Safe to run any number of times.
 */
export async function runBillingDaily(deps: BillingDeps): Promise<BillingResult> {
  const result: BillingResult = { reconciled: 0, noticed: 0, restricted: 0, overageCharged: 0 };
  // One at a time: a parallel burst would starve the connection pool and hit the provider's rate limit.
  for (const tenant of await subscribedTenants(deps)) {
    try {
      if (tenant.billingSubscriptionId) await reconcileTenant(deps, tenant.billingSubscriptionId);
      result.reconciled += 1;
      if (await chargeOverage(deps, tenant)) result.overageCharged += 1;
    } catch (error) {
      deps.alert(AlertEvent.jobFailed, { tenantId: tenant.id, code: BILLING_FAILED }, error);
    }
  }
  Object.assign(result, await climbLadder(deps));
  return result;
}
