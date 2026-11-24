import pg from 'pg';
import { PgBoss } from 'pg-boss';
import {
  DEFAULT_QUEUE_OPTIONS,
  QUEUE_SCHEMA,
  deadLetterName,
  type QueueDefinition,
} from './definitions.ts';

const RUNTIME_ROLE = 'app_runtime';

// The app role works jobs and runs pg-boss maintenance, which creates daily stats
// partitions: so it may create objects in the pgboss schema only, never in public (RN-02).
const GRANTS = `
  grant usage, create on schema ${QUEUE_SCHEMA} to ${RUNTIME_ROLE};
  grant select, insert, update, delete on all tables in schema ${QUEUE_SCHEMA} to ${RUNTIME_ROLE};
  grant usage, select on all sequences in schema ${QUEUE_SCHEMA} to ${RUNTIME_ROLE};
  alter default privileges in schema ${QUEUE_SCHEMA}
    grant select, insert, update, delete on tables to ${RUNTIME_ROLE};
  alter default privileges in schema ${QUEUE_SCHEMA}
    grant usage, select on sequences to ${RUNTIME_ROLE};
`;

/**
 * Runs as the migrator: installs or migrates the pg-boss schema, grants the app role,
 * then creates each queue and its dead-letter queue, with our retry defaults. Idempotent.
 */
export async function installQueues(
  migratorUrl: string,
  queues: readonly QueueDefinition[],
): Promise<void> {
  const boss = new PgBoss({
    connectionString: migratorUrl,
    schema: QUEUE_SCHEMA,
    supervise: false,
  });
  await boss.start();
  try {
    await grantRuntime(migratorUrl);
    for (const queue of queues) await ensureQueue(boss, queue);
  } finally {
    await boss.stop({ graceful: false });
  }
}

async function grantRuntime(migratorUrl: string): Promise<void> {
  const client = new pg.Client({ connectionString: migratorUrl });
  await client.connect();
  try {
    await client.query(GRANTS);
  } finally {
    await client.end();
  }
}

async function ensureQueue(
  boss: PgBoss,
  { name, policy, options }: QueueDefinition,
): Promise<void> {
  const deadLetter = deadLetterName(name);
  if (!(await boss.getQueue(deadLetter))) await boss.createQueue(deadLetter);
  if (await boss.getQueue(name)) return;
  await boss.createQueue(name, {
    ...DEFAULT_QUEUE_OPTIONS,
    ...options,
    ...(policy ? { policy } : {}),
    deadLetter,
  });
}
