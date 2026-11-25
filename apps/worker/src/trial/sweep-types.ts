import type { EmailSender } from '@app/core';
import type { Db } from '@app/db';
import type { Alert } from '@app/observability';

export interface TrialUrls {
  /** Resumes the setup (`/configuracao`). */
  resume: string;
  /** The panel home, where the end-of-trial banner is. */
  panel: string;
}

export interface SweepDeps {
  db: Db;
  email: EmailSender;
  now: Date;
  urls: TrialUrls;
  /** Failures of one tenant never stop the others; the next sweep retries them. */
  alert: Alert;
  /** Tests: limits the sweep to one tenant (the dev database holds thousands). */
  onlyTenantId?: string;
}

export interface TenantRow {
  id: string;
  createdAt: Date;
  trialEndsAt: Date | null;
  onboardingProgress: unknown;
  reminder1dSentAt: Date | null;
  reminder3dSentAt: Date | null;
}

export interface SweepResult {
  ended: number;
  reminded: number;
}
