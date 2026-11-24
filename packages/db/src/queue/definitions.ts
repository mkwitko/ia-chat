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

/** Every queue the app uses, created by `pnpm db:migrate` with our retry defaults. Stages add theirs here. */
export const QUEUES: readonly QueueDefinition[] = [];
