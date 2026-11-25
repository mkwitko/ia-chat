import { TenantStatusName } from './status.ts';

// S-05 (spec 09, RF-80, RF-81, RF-84, RF-88): the 14-day trial without card.

export const TRIAL_DAYS = 14;
/** RF-88: data stays this long after the trial ends without a subscription. */
export const DATA_RETENTION_DAYS = 30;
/** RF-81: conversations a trial may open before the assistant goes quiet (hypothesis H-24). */
export const TRIAL_CONVERSATION_CAP = 100;

const MS_PER_DAY = 86_400_000;

export const TrialPhase = { none: 'none', active: 'active', ended: 'ended' } as const;
export type TrialPhase = (typeof TrialPhase)[keyof typeof TrialPhase];

export interface TrialInput {
  status: string;
  trialEndsAt: Date | null;
  trialEndedAt: Date | null;
  now: Date;
}

export interface TrialView {
  phase: TrialPhase;
  /** Whole days left, rounded up; 0 once ended. */
  daysLeft: number;
  /** ISO time until which the data is kept; only when the trial ended. */
  dataKeptUntil: string | null;
}

/** What the owner sees. Tenants without a trial date (the pilot) have no trial at all. */
export function trialView({ status, trialEndsAt, trialEndedAt, now }: TrialInput): TrialView {
  if (trialEndedAt && status !== TenantStatusName.active) {
    const until = new Date(trialEndedAt.getTime() + DATA_RETENTION_DAYS * MS_PER_DAY);
    return { phase: TrialPhase.ended, daysLeft: 0, dataKeptUntil: until.toISOString() };
  }
  if (status !== TenantStatusName.trial || !trialEndsAt) {
    return { phase: TrialPhase.none, daysLeft: 0, dataKeptUntil: null };
  }
  const daysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / MS_PER_DAY));
  return { phase: TrialPhase.active, daysLeft, dataKeptUntil: null };
}

export interface TrialUsage {
  status: string;
  conversations: number;
}

/** RF-81: a trial tenant at the conversation cap gets the "wait for the professional" reply. */
export function trialCapReached({ status, conversations }: TrialUsage): boolean {
  return status === TenantStatusName.trial && conversations >= TRIAL_CONVERSATION_CAP;
}

export const trialExpired = (trialEndsAt: Date | null, now: Date): boolean =>
  trialEndsAt !== null && trialEndsAt.getTime() <= now.getTime();

export const Reminder = { first: 'first', second: 'second' } as const;
export type Reminder = (typeof Reminder)[keyof typeof Reminder];

/** RF-84: idle days that trigger each reminder. */
export const REMINDER_AFTER_DAYS = { [Reminder.first]: 1, [Reminder.second]: 3 } as const;

export interface ReminderInput {
  lastActivityAt: Date;
  now: Date;
  sent: { first: Date | null; second: Date | null };
}

/** The one reminder to send now, or null. A late sweep sends only the latest, never both. */
export function reminderDue({ lastActivityAt, now, sent }: ReminderInput): Reminder | null {
  const idleDays = (now.getTime() - lastActivityAt.getTime()) / MS_PER_DAY;
  if (!sent.second && idleDays >= REMINDER_AFTER_DAYS.second) return Reminder.second;
  if (!sent.first && !sent.second && idleDays >= REMINDER_AFTER_DAYS.first) return Reminder.first;
  return null;
}
