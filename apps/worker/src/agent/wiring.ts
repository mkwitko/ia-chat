import { aiConfigured, aiEnvSchema, createEnvGateway, startTracing } from '@app/ai';
import { createChannelSender } from '@app/channels';
import { NodeEnv } from '@app/core';
import {
  DRAFT_REMINDER_QUEUE,
  HANDOFF_REMINDER_QUEUE,
  TURN_QUEUE,
  sendTenantJob,
  type Db,
} from '@app/db';
import type { PgBoss } from 'pg-boss';
import * as z from 'zod';
import { DRAFT_REMINDER_DELAY_MS } from '../conversation/reminder-job.ts';
import { HANDOFF_REMINDER_DELAY_MS } from '../conversation/handoff.ts';
import { ReminderKind, runTurn, type TurnDeps } from '../conversation/turn.ts';
import type { Notifier } from '../notify/index.ts';
import { createConversationAgent } from './respond.ts';

const NOTIFY_FAILED = 'push notification failed';
const NO_AI_KEY = 'VERCEL_API_KEY missing: conversation turns are not consumed';
// RN-03: the job carries its tenant; runTurn enters withTenant for every read and write.
const turnJob = z.object({
  tenantId: z.uuid(),
  data: z.object({ conversationId: z.uuid(), version: z.number().int() }),
});
const workerEnvSchema = aiEnvSchema.extend({ META_ACCESS_TOKEN: z.string().min(1).optional() });

interface TurnWiring {
  boss: PgBoss;
  notifier: Notifier;
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
  const deps = turnDeps({ db, env, nodeEnv, log, boss, notifier });
  // runTurn opens its own transactions (the model call stays outside any of them).
  await boss.work(TURN_QUEUE.name, async (jobs) => {
    for (const job of jobs) {
      const { tenantId, data } = turnJob.parse(job.data);
      await runTurn(db, { tenantId, ...data }, deps);
    }
  });
  return { shutdown };
}

interface DepsSources {
  db: Db;
  boss: PgBoss;
  notifier: Notifier;
  env: z.infer<typeof workerEnvSchema>;
  nodeEnv: string;
  log: TurnWiring['log'];
}

function turnDeps({ db, boss, notifier, env, nodeEnv, log }: DepsSources): TurnDeps {
  const gateway = createEnvGateway({ db, env, nodeEnv });
  return {
    respond: createConversationAgent({ db, gateway }),
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
      devFallback: nodeEnv !== NodeEnv.production,
      log: log.info,
    }),
  };
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
