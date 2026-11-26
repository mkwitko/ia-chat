import type { QueueOptions, QueuePolicy } from 'pg-boss';

/** pg-boss lives in its own schema, owned by the migrator role. */
export const QUEUE_SCHEMA = 'pgboss';

const DEAD_LETTER_SUFFIX = '.dead';
const DEFAULT_RETRY_LIMIT = 3;
const DEFAULT_RETRY_DELAY_SECONDS = 5;

/** Retry with exponential backoff; after the last attempt the job goes to the dead-letter queue. */
export const DEFAULT_QUEUE_OPTIONS = {
  retryLimit: DEFAULT_RETRY_LIMIT,
  retryDelay: DEFAULT_RETRY_DELAY_SECONDS,
  retryBackoff: true,
} as const satisfies QueueOptions;

export interface QueueDefinition {
  name: string;
  /** 'short' keeps a single queued job per singletonKey (e.g. one pending turn per conversation). */
  policy?: QueuePolicy;
  options?: QueueOptions;
}

export function deadLetterName(queue: string): string {
  return `${queue}${DEAD_LETTER_SUFFIX}`;
}

/** E-09: a stored webhook batch (inbound_events) waiting to become messages and statuses. */
export const INBOUND_QUEUE: QueueDefinition = { name: 'inbound.process' };

/** E-09 (RF-26): daily list of outbound messages with no delivery status after an hour. */
export const RECONCILE_QUEUE: QueueDefinition = { name: 'messages.reconcile' };

/** E-11: one turn of a conversation, scheduled 6 to 20 s after the patient's messages. */
export const TURN_QUEUE: QueueDefinition = { name: 'conversation.turn' };

/** E-12 (RF-36): reminds the professional of a handoff nobody answered. */
export const HANDOFF_REMINDER_QUEUE: QueueDefinition = { name: 'conversation.handoff_reminder' };

/** E-18b (RF-13): a draft nobody approved; the professional is reminded, nothing is sent. */
export const DRAFT_REMINDER_QUEUE: QueueDefinition = { name: 'conversation.draft_reminder' };

/** E-22b (RF-15): the nightly agenda push of one tenant; one pg-boss schedule per tenant. */
export const SUMMARY_QUEUE: QueueDefinition = { name: 'agenda.nightly_summary' };

/** E-22b: re-reads the tenants' summary times and refreshes their schedules (every 15 minutes). */
export const SUMMARY_SYNC_QUEUE: QueueDefinition = { name: 'agenda.summary_sync' };

/** S-05: hourly sweep of trial tenants: abandonment reminders and the end of the trial. */
export const TRIAL_SWEEP_QUEUE: QueueDefinition = { name: 'trial.sweep' };

/** E-22 (RF-46, RF-47): every minute, sends the confirmations and reminders that are due. */
export const REMINDER_SWEEP_QUEUE: QueueDefinition = { name: 'reminders.sweep' };

/** E-25: daily reconciliation with Asaas, the overdue ladder and the overage charge. */
export const BILLING_RECONCILE_QUEUE: QueueDefinition = { name: 'billing.reconcile' };

/** E-10 (RF-24): downloads one inbound media to R2 and, for audio, transcribes it. */
export const MEDIA_QUEUE: QueueDefinition = { name: 'media.fetch' };
/** E-26 (RF-63): daily erasure of the data of accounts closed for 30 days. */
export const TENANT_DELETION_QUEUE: QueueDefinition = { name: 'retention.tenant_deletion' };
/** E-24b (H-47): daily purge of staged history import data the owner did not decide on. */
export const IMPORT_STAGING_PURGE_QUEUE: QueueDefinition = { name: 'retention.import_staging' };

/** Research 09 #2: the owner's Monday report of one tenant; one pg-boss schedule per tenant. */
export const WEEKLY_REPORT_QUEUE: QueueDefinition = { name: 'report.weekly' };

/** Every queue the app uses, created by `pnpm db:migrate` with our retry defaults. Stages add theirs here. */
export const QUEUES: readonly QueueDefinition[] = [
  INBOUND_QUEUE,
  RECONCILE_QUEUE,
  TURN_QUEUE,
  HANDOFF_REMINDER_QUEUE,
  DRAFT_REMINDER_QUEUE,
  SUMMARY_QUEUE,
  SUMMARY_SYNC_QUEUE,
  TRIAL_SWEEP_QUEUE,
  REMINDER_SWEEP_QUEUE,
  BILLING_RECONCILE_QUEUE,
  MEDIA_QUEUE,
  TENANT_DELETION_QUEUE,
  IMPORT_STAGING_PURGE_QUEUE,
  WEEKLY_REPORT_QUEUE,
];
