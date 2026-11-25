import { parseEnv } from '@app/core';
import {
  AlertEvent,
  createAlert,
  createLogger,
  initSentry,
  logProcessErrors,
  startReadinessServer,
} from '@app/observability';
import {
  INBOUND_QUEUE,
  QUEUES,
  QUEUE_SCHEMA,
  RECONCILE_QUEUE,
  HANDOFF_REMINDER_QUEUE,
  DRAFT_REMINDER_QUEUE,
  SUMMARY_QUEUE,
  SUMMARY_SYNC_QUEUE,
  TRIAL_SWEEP_QUEUE,
  createDb,
  recordOpsEvent,
  watchDeadLetters,
  workTenantQueue,
} from '@app/db';
import { PgBoss } from 'pg-boss';
import { startTurnWorker } from './agent/wiring.ts';
import { remindDraft, remindHandoff, tenantOf } from './conversation/reminder-job.ts';
import { NotifyReason, startNotifier, startSummaryNotifier } from './notify/index.ts';
import { sendNightlySummary } from './agenda/nightly-summary.ts';
import { syncSummarySchedules } from './agenda/summary-schedule.ts';
import { turnScheduler } from './conversation/turn-scheduler.ts';
import { processInboundEvent } from './inbound/job.ts';
import { findStaleMessages } from './inbound/reconcile.ts';
import { logEmailSender } from './trial/log-sender.ts';
import { sweepTrials } from './trial/sweep.ts';
import { startReminderSweep } from './reminders/wiring.ts';

const WORKER_READY = 'worker ready';
const RECONCILE_CODE = 'no_status_after_1h';
const TRIAL_SWEPT = 'trial sweep done';
const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;
const REMINDER_FAILED = 'reminder push failed';
// RF-26: every morning, in the clinics' time zone.
const RECONCILE_CRON = '0 7 * * *';
const RECONCILE_TZ = 'America/Sao_Paulo';
const SUMMARY_SYNC_CRON = '*/15 * * * *';
const TRIAL_SWEEP_CRON = '0 * * * *';
const DEFAULT_WEB_ORIGIN = 'http://localhost:5173';
const RESUME_PATH = '/configuracao';

const env = parseEnv(process.env);
const log = createLogger({ service: 'worker', ...env, level: env.LOG_LEVEL });
const sentryOn = initSentry({
  service: 'worker',
  dsn: env.SENTRY_DSN,
  release: env.APP_RELEASE,
  environment: env.NODE_ENV,
});
if (!sentryOn) logProcessErrors(log);
const db = createDb(env.DATABASE_URL);
const alert = createAlert({ log, record: (row) => recordOpsEvent(db, row) });
// App role: no schema migration here; `pnpm db:migrate` owns it (RN-02).
const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  schema: QUEUE_SCHEMA,
  migrate: false,
});
boss.on('error', (error) => {
  alert(AlertEvent.queueError, {}, error);
});

await boss.start();
for (const queue of QUEUES) {
  await watchDeadLetters({
    boss,
    queue: queue.name,
    onDead: ({ queue: deadQueue, jobId, tenantId }) => {
      alert(AlertEvent.deadLetter, { queue: deadQueue, jobId, ...(tenantId ? { tenantId } : {}) });
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
      alert,
      scheduleTurn: turnScheduler(boss),
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
  for (const { tenantId } of await findStaleMessages(db, new Date())) {
    alert(AlertEvent.deliveryFailure, { tenantId, code: RECONCILE_CODE });
  }
});

// RF-15: the professional's agenda for tomorrow, at the time each tenant chose (default 20:00).
const summaryNotifier = startSummaryNotifier({
  db,
  nodeEnv: env.NODE_ENV,
  source: process.env,
  log: appLog,
});
await workTenantQueue({
  boss,
  db,
  queue: SUMMARY_QUEUE.name,
  handler: (tx, _data, job) =>
    sendNightlySummary(tx, { tenantId: tenantOf(job), now: new Date() }, (summary) =>
      summaryNotifier({ tenantId: tenantOf(job), ...summary }),
    ),
});
await syncSummarySchedules(db, boss);
await boss.schedule(SUMMARY_SYNC_QUEUE.name, SUMMARY_SYNC_CRON);
await boss.work(SUMMARY_SYNC_QUEUE.name, async () => {
  await syncSummarySchedules(db, boss);
});

// S-05 (RF-84, RF-88): abandonment reminders and the end of the trial, once each, every hour.
const webOrigin = process.env.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN;
const trialEmail = logEmailSender((fields, message) => {
  log.info(fields, message);
});
await boss.schedule(TRIAL_SWEEP_QUEUE.name, TRIAL_SWEEP_CRON);
await boss.work(TRIAL_SWEEP_QUEUE.name, async () => {
  const result = await sweepTrials({
    db,
    email: trialEmail,
    now: new Date(),
    urls: { resume: `${webOrigin}${RESUME_PATH}`, panel: webOrigin },
    alert,
  });
  log.info(result, TRIAL_SWEPT);
});

// E-22 (RF-46, RF-47): confirmations and reminders, every minute.
await startReminderSweep({
  boss,
  db,
  alert,
  nodeEnv: env.NODE_ENV,
  accessToken: process.env.META_ACCESS_TOKEN,
  log: appLog.info,
});

const turns = await startTurnWorker({
  boss,
  db,
  notifier,
  alert,
  nodeEnv: env.NODE_ENV,
  source: process.env,
  log: appLog,
});

const readiness = env.WORKER_HEALTH_PORT
  ? await startReadinessServer(env.WORKER_HEALTH_PORT, {
      database: () => db.client.$queryRaw`select 1`,
      queue: () => boss.getQueues(),
    })
  : undefined;
log.info({ healthPort: env.WORKER_HEALTH_PORT }, WORKER_READY);

for (const signal of SHUTDOWN_SIGNALS) {
  process.once(signal, () => {
    readiness?.close();
    void turns
      .shutdown()
      .then(() => boss.stop())
      .then(() => db.client.$disconnect())
      .then(() => {
        process.exit(0);
      });
  });
}
