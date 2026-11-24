import { parseEnv } from '@app/core';
import {
  INBOUND_QUEUE,
  QUEUES,
  QUEUE_SCHEMA,
  RECONCILE_QUEUE,
  createDb,
  watchDeadLetters,
  workTenantQueue,
} from '@app/db';
import { PgBoss } from 'pg-boss';
import pino from 'pino';
import { processInboundEvent } from './inbound/job.ts';
import { findStaleMessages } from './inbound/reconcile.ts';

const QUEUE_ERROR = 'queue error';
const DEAD_LETTER = 'job exhausted its retries';
const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;
const STALE_MESSAGES = 'outbound messages without delivery status after 1 hour';
// RF-26: every morning, in the clinics' time zone.
const RECONCILE_CRON = '0 7 * * *';
const RECONCILE_TZ = 'America/Sao_Paulo';

const env = parseEnv(process.env);
const log = pino();
const db = createDb(env.DATABASE_URL);
// App role: no schema migration here; `pnpm db:migrate` owns it (RN-02).
const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  schema: QUEUE_SCHEMA,
  migrate: false,
});
boss.on('error', (error) => {
  log.error({ err: error }, QUEUE_ERROR);
});

await boss.start();
// ponytail: alert = error log, picked up by Sentry/Axiom in E-26.
for (const queue of QUEUES) {
  await watchDeadLetters({
    boss,
    queue: queue.name,
    onDead: (dead) => {
      log.error(dead, DEAD_LETTER);
    },
  });
}

await workTenantQueue({
  boss,
  db,
  queue: INBOUND_QUEUE.name,
  handler: (tx, data) =>
    processInboundEvent(tx, data, {
      alert: (fields, message) => {
        log.error(fields, message);
      },
    }),
});

await boss.schedule(RECONCILE_QUEUE.name, RECONCILE_CRON, null, { tz: RECONCILE_TZ });
await boss.work(RECONCILE_QUEUE.name, async () => {
  for (const stale of await findStaleMessages(db, new Date())) log.error(stale, STALE_MESSAGES);
});

for (const signal of SHUTDOWN_SIGNALS) {
  process.once(signal, () => {
    void boss
      .stop()
      .then(() => db.client.$disconnect())
      .then(() => {
        process.exit(0);
      });
  });
}
