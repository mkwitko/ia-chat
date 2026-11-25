import { AlertEvent } from '@app/observability';
import { trialExpired } from '@app/core';
import { TenantStatus } from '@app/db';
import { endTrial } from './end-trial.ts';
import { remindIfDue } from './reminders.ts';
import type { SweepDeps, SweepResult } from './sweep-types.ts';

const SWEEP_FAILED = 'trial_sweep';

/**
 * S-05: one pass over the trial tenants (those with an end date; the pilot has none). Ends the
 * expired trials and sends the due abandonment reminders. Safe to run any number of times.
 */
export async function sweepTrials(deps: SweepDeps): Promise<SweepResult> {
  const tenants = await deps.db.client.tenant.findMany({
    where: {
      status: TenantStatus.trial,
      trialEndedAt: null,
      trialEndsAt: { not: null },
      ...(deps.onlyTenantId ? { id: deps.onlyTenantId } : {}),
    },
    select: {
      id: true,
      createdAt: true,
      trialEndsAt: true,
      onboardingProgress: true,
      reminder1dSentAt: true,
      reminder3dSentAt: true,
    },
  });
  const result: SweepResult = { ended: 0, reminded: 0 };
  // One at a time: a parallel burst would starve the connection pool.
  for (const tenant of tenants) {
    try {
      if (trialExpired(tenant.trialEndsAt, deps.now)) {
        if (await endTrial(deps, tenant.id)) result.ended += 1;
      } else if (await remindIfDue(deps, tenant)) result.reminded += 1;
    } catch (error) {
      deps.alert(AlertEvent.jobFailed, { tenantId: tenant.id, code: SWEEP_FAILED }, error);
    }
  }
  return result;
}
