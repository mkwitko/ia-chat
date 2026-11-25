import { parseEnv } from '@app/core';
import {
  INBOUND_QUEUE,
  QUEUES,
  QUEUE_SCHEMA,
  RECONCILE_QUEUE,
  TURN_QUEUE,
  HANDOFF_REMINDER_QUEUE,
  DRAFT_REMINDER_QUEUE,
  createDb,
  sendTenantJob,
  watchDeadLetters,
  workTenantQueue,
} from '@app/db';
import { PgBoss } from 'pg-boss';
import pino from 'pino';
import { startTurnWorker } from './agent/wiring.ts';
import { remindDraft, remindHandoff, tenantOf } from './conversation/reminder-job.ts';
import { NotifyReason, startNotifier } from './notify/index.ts';
import type { TurnRequest } from './conversation/schedule.ts';
import { processInboundEvent } from './inbound/job.ts';
import { findStaleMessages } from './inbound/reconcile.ts';

const QUEUE_ERROR = 'queue error';
const DEAD_LETTER = 'job exhausted its retries';
// E-11: one job per (conversation, version); an older version finds a newer one and skips.
// ponytail: conversation.turn has no consumer until the agent exists (E-13); jobs wait there.
async function scheduleTurn(tenantId: string, request: TurnRequest): Promise<void> {
  await sendTenantJob({
    boss,
    queue: TURN_QUEUE.name,
    job: { tenantId, data: { conversationId: request.conversationId, version: request.version } },
    options: {
      startAfter: new Date(Date.now() + request.delayMs),
      singletonKey: `${request.conversationId}:${String(request.version)}`,
    },
  });
}

const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;
const REMINDER_FAILED = 'reminder push failed';
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

const appLog = {
  warn: (fields: object, message: string) => {
    log.warn(fields, message);
  },
  info: (fields: object, message: string) => {
    log.info(fields, message);
  },
};
const notifier = startNotifier({ db, nodeEnv: env.NODE_ENV, source: process.env, log: appLog });
const remind = (tenantId: string, reason: NotifyReason) => (conversationId: string) => {
  notifier({ tenantId, conversationId, reason }).catch((error: unknown) => {
    log.error({ tenantId, error: String(error) }, REMINDER_FAILED);
  });
};

await workTenantQueue({
  boss,
  db,
  queue: INBOUND_QUEUE.name,
  handler: (tx, data) =>
    processInboundEvent(tx, data, {
      alert: (fields, message) => {
        log.error(fields, message);
      },
      scheduleTurn,
      notifyUsage: (tenantId, { reason, conversationId }) => {
        remind(tenantId, reason)(conversationId);
      },
    }),
});

// RF-36 and RF-13: the reminders push the professional again (spec 10, "Notificações").
await workTenantQueue({
  boss,
  db,
  queue: HANDOFF_REMINDER_QUEUE.name,
  handler: (tx, data, job) =>
    remindHandoff(tx, data, remind(tenantOf(job), NotifyReason.handoffReminder)),
});
await workTenantQueue({
  boss,
  db,
  queue: DRAFT_REMINDER_QUEUE.name,
  handler: (tx, data, job) =>
    remindDraft(tx, data, remind(tenantOf(job), NotifyReason.draftReminder)),
});

await boss.schedule(RECONCILE_QUEUE.name, RECONCILE_CRON, null, { tz: RECONCILE_TZ });
await boss.work(RECONCILE_QUEUE.name, async () => {
  for (const stale of await findStaleMessages(db, new Date())) log.error(stale, STALE_MESSAGES);
});

const turns = await startTurnWorker({
  boss,
  db,
  notifier,
  nodeEnv: env.NODE_ENV,
  source: process.env,
  log: appLog,
});

for (const signal of SHUTDOWN_SIGNALS) {
  process.once(signal, () => {
    void turns
      .shutdown()
      .then(() => boss.stop())
      .then(() => db.client.$disconnect())
      .then(() => {
        process.exit(0);
      });
  });
}
