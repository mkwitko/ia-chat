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

/** Every queue the app uses, created by `pnpm db:migrate` with our retry defaults. Stages add theirs here. */
export const QUEUES: readonly QueueDefinition[] = [
  INBOUND_QUEUE,
  RECONCILE_QUEUE,
  TURN_QUEUE,
  HANDOFF_REMINDER_QUEUE,
];
