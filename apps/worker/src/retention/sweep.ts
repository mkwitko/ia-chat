import { DATA_RETENTION_DAYS } from '@app/core';
import { TenantStatus, type Db } from '@app/db';
import { AlertEvent, type Alert } from '@app/observability';
import { eraseTenant } from './erase.ts';

const DELETION_FAILED = 'tenant_deletion';
const MS_PER_DAY = 86_400_000;

export interface DeletionDeps {
  db: Db;
  now: Date;
  /** One tenant's failure never stops the others; tomorrow's run retries it. Ids only, no content. */
  alert: Alert;
  /** Tests: limits the run to one tenant (the dev database holds thousands). */
  onlyTenantId?: string;
}

export interface DeletionResult {
  erased: number;
}

interface ClosedTenant {
  id: string;
  status: TenantStatus;
  cancelledAt: Date | null;
  billingEndsAt: Date | null;
  trialEndedAt: Date | null;
}

/**
 * When the 30 days start: the cancellation, or for a trial that ended without a subscription
 * (status restricted, RF-88) the end of the trial. Null while the account is open.
 */
function closedAt(tenant: ClosedTenant): Date | null {
  if (tenant.status === TenantStatus.cancelled) {
    return tenant.cancelledAt ?? tenant.billingEndsAt ?? tenant.trialEndedAt;
  }
  return tenant.status === TenantStatus.restricted ? tenant.trialEndedAt : null;
}

function isDue(tenant: ClosedTenant, now: Date): boolean {
  const start = closedAt(tenant);
  return start !== null && now.getTime() >= start.getTime() + DATA_RETENTION_DAYS * MS_PER_DAY;
}

/**
 * E-26 (RF-63): once a day, erases the data of accounts closed for 30 days. Safe to run any number of times.
 */
export async function sweepTenantDeletion(deps: DeletionDeps): Promise<DeletionResult> {
  const candidates = await deps.db.client.tenant.findMany({
    where: {
      dataDeletedAt: null,
      // A restricted tenant with a subscription is just overdue: only the trial path (none) counts.
      OR: [
        { status: TenantStatus.cancelled },
        { status: TenantStatus.restricted, billingSubscriptionId: null },
      ],
      ...(deps.onlyTenantId ? { id: deps.onlyTenantId } : {}),
    },
    select: { id: true, status: true, cancelledAt: true, billingEndsAt: true, trialEndedAt: true },
  });
  const result: DeletionResult = { erased: 0 };
  // One at a time: a parallel burst would starve the connection pool.
  for (const tenant of candidates.filter((candidate) => isDue(candidate, deps.now))) {
    try {
      await eraseTenant(deps.db, tenant.id, deps.now);
      result.erased += 1;
    } catch {
      // No cause on purpose: a database error can quote the row it failed on (RN-38).
      deps.alert(AlertEvent.jobFailed, { tenantId: tenant.id, code: DELETION_FAILED });
    }
  }
  return result;
}
