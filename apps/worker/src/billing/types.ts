import type { BillingProvider, EmailSender } from '@app/core';
import type { Db } from '@app/db';
import type { Alert } from '@app/observability';

export interface BillingDeps {
  db: Db;
  provider: BillingProvider;
  email: EmailSender;
  now: Date;
  /** The panel home, linked from the overdue notices. */
  panelUrl: string;
  /** One tenant's failure never stops the others; tomorrow's run retries it. */
  alert: Alert;
  /** Tests: limits the run to one tenant (the dev database holds thousands). */
  onlyTenantId?: string;
}

export interface BillingResult {
  reconciled: number;
  noticed: number;
  restricted: number;
  overageCharged: number;
}
