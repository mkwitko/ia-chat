import { parseEnv } from '@app/core';
import { QUEUES, QUEUE_SCHEMA, createDb, watchDeadLetters } from '@app/db';
import { PgBoss } from 'pg-boss';
import pino from 'pino';

const QUEUE_ERROR = 'queue error';
const DEAD_LETTER = 'job exhausted its retries';
const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;

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
