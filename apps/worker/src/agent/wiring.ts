import { aiConfigured, aiEnvSchema, createEnvGateway, startTracing } from '@app/ai';
import { pushEnvSchema, vapidFrom } from '../notify/push.ts';
import { createChannelSender, wahaConfig, wahaEnvSchema } from '@app/channels';
import {
  NodeEnv,
  channelTokenReader,
  googleCalendarConfig,
  googleCalendarEnvSchema,
} from '@app/core';
import {
  createCalendarResolver,
  DRAFT_REMINDER_QUEUE,
  HANDOFF_REMINDER_QUEUE,
  TURN_QUEUE,
  sendTenantJob,
  type Db,
} from '@app/db';
import { AlertEvent, withLogContext, type Alert } from '@app/observability';
import type { PgBoss } from 'pg-boss';
import * as z from 'zod';
import { DRAFT_REMINDER_DELAY_MS } from '../conversation/reminder-job.ts';
import { HANDOFF_REMINDER_DELAY_MS } from '../conversation/handoff.ts';
import { ReminderKind, runTurn, type TurnDeps } from '../conversation/turn.ts';
import type { Notifier } from '../notify/index.ts';
import { createConversationAgent } from './respond.ts';
import { HEALTH_JUDGE_DOWN, type EventLog } from './health-guard.ts';

const NOTIFY_FAILED = 'push notification failed';
const NO_AI_KEY = 'VERCEL_API_KEY missing: conversation turns are not consumed';
// RN-03: the job carries its tenant; runTurn enters withTenant for every read and write.
const turnJob = z.object({
  tenantId: z.uuid(),
  data: z.object({ conversationId: z.uuid(), version: z.number().int() }),
});
const workerEnvSchema = aiEnvSchema
  .extend({
    META_ACCESS_TOKEN: z.string().min(1).optional(),
    META_TOKEN_KEY: z.string().min(1).optional(),
  })
  .extend(pushEnvSchema.shape)
  .extend(googleCalendarEnvSchema.shape)
  .extend(wahaEnvSchema.shape);

interface TurnWiring {
  boss: PgBoss;
  notifier: Notifier;
  alert: Alert;
  db: Db;
  nodeEnv: string;
  source: Record<string, string | undefined>;
  log: {
    warn: (fields: object, message: string) => void;
    info: (fields: object, message: string) => void;
  };
}

/** E-13: the conversation.turn consumer with the real agent and channel. */
export async function startTurnWorker({
  boss,
  notifier,
  alert,
  db,
  nodeEnv,
  source,
  log,
}: TurnWiring): Promise<{ shutdown: () => Promise<void> }> {
  const env = workerEnvSchema.parse(source);
  const tracing = startTracing(env, nodeEnv);
  const shutdown = async () => tracing?.shutdown();
  if (!aiConfigured(env)) {
    log.warn({}, NO_AI_KEY);
    return { shutdown };
  }
  const deps = turnDeps({ db, env, nodeEnv, log, boss, notifier, alert });
  // runTurn opens its own transactions (the model call stays outside any of them).
  await boss.work(TURN_QUEUE.name, async (jobs) => {
    for (const job of jobs) {
      const { tenantId, data } = turnJob.parse(job.data);
      const context = { jobId: job.id, queue: TURN_QUEUE.name, tenantId };
      await withLogContext({ ...context, conversationId: data.conversationId }, () =>
        runTurn(db, { tenantId, ...data }, deps),
      );
    }
  });
  return { shutdown };
}

interface DepsSources {
  db: Db;
  boss: PgBoss;
  notifier: Notifier;
  alert: Alert;
  env: z.infer<typeof workerEnvSchema>;
  nodeEnv: string;
  log: TurnWiring['log'];
}

function turnDeps({ db, boss, notifier, alert, env, nodeEnv, log }: DepsSources): TurnDeps {
  const gateway = createEnvGateway({ db, env, nodeEnv });
  return {
    respond: createConversationAgent({
      db,
      gateway,
      pushEnabled: vapidFrom(env) !== null,
      log: alertOnJudgeDown(log.warn, alert),
      ...calendarDeps({ db, env, alert }),
    }),
    alert,
    notify: (input) => {
      // Fire and forget: a failing push must never fail the turn.
      notifier(input).catch((error: unknown) => {
        log.warn(
          { tenantId: input.tenantId, reason: input.reason, error: String(error) },
          NOTIFY_FAILED,
        );
      });
    },
    scheduleReminder: reminderScheduler(boss),
    send: createChannelSender({
      accessToken: env.META_ACCESS_TOKEN,
      readChannelToken: channelTokenReader(env.META_TOKEN_KEY),
      waha: wahaConfig(env),
      devFallback: nodeEnv !== NodeEnv.production,
      log: log.info,
    }),
  };
}

/** E-21: the tenant's Google Calendar, only when the credentials and the token key are set. */
function calendarDeps({ db, env, alert }: Pick<DepsSources, 'db' | 'env' | 'alert'>) {
  const config = googleCalendarConfig(env);
  return config ? { calendar: createCalendarResolver({ db, config, alert }) } : {};
}

/** RF-36 and RF-13: a delayed job per turn; the consumer checks it still applies. */
function reminderScheduler(boss: PgBoss): NonNullable<TurnDeps['scheduleReminder']> {
  return async ({ tenantId, conversationId, turnId, kind }) => {
    const draft = kind === ReminderKind.draft;
    const delayMs = draft ? DRAFT_REMINDER_DELAY_MS : HANDOFF_REMINDER_DELAY_MS;
    await sendTenantJob({
      boss,
      queue: draft ? DRAFT_REMINDER_QUEUE.name : HANDOFF_REMINDER_QUEUE.name,
      job: { tenantId, data: { conversationId, turnId } },
      options: { startAfter: new Date(Date.now() + delayMs), singletonKey: turnId },
    });
  };
}

const JUDGE_DOWN_CODE = 'health_judge_down';

/** A judge that does not answer means nothing gets stored (M-03): the operator must know. */
function alertOnJudgeDown(log: EventLog, alert: Alert): EventLog {
  return (fields, message) => {
    log(fields, message);
    if (message !== HEALTH_JUDGE_DOWN) return;
    const { tenantId } = fields as { tenantId?: string };
    alert(AlertEvent.jobFailed, { ...(tenantId ? { tenantId } : {}), code: JUDGE_DOWN_CODE });
  };
}
