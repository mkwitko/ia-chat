import {
  aiEnvSchema,
  createAiGateway,
  DEFAULT_CAPS,
  dbUsageStore,
  devModelResolver,
  gatewayModelResolver,
  GROQ_DEV_ROUTES,
  PRICE_TABLE,
  routeTable,
  startTracing,
  typeSafeJudge,
} from '@app/ai';
import { NodeEnv } from '@app/core';
import { TURN_QUEUE, type Db } from '@app/db';
import type { PgBoss } from 'pg-boss';
import * as z from 'zod';
import { runTurn, type TurnDeps } from '../conversation/turn.ts';
import { createConversationAgent } from './respond.ts';
import { createChannelSender } from './sender.ts';

const NOTIFY_PENDING = 'professional must be notified (no push yet)';
const NO_AI_KEY = 'VERCEL_API_KEY missing: conversation turns are not consumed';
const JUDGE_OFF = { ask: () => Promise.reject(new Error('TYPESAFE_API_KEY missing')) };
// RN-03: the job carries its tenant; runTurn enters withTenant for every read and write.
const turnJob = z.object({
  tenantId: z.uuid(),
  data: z.object({ conversationId: z.uuid(), version: z.number().int() }),
});
const workerEnvSchema = aiEnvSchema.extend({ META_ACCESS_TOKEN: z.string().min(1).optional() });

interface TurnWiring {
  boss: PgBoss;
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
  db,
  nodeEnv,
  source,
  log,
}: TurnWiring): Promise<{ shutdown: () => Promise<void> }> {
  const env = workerEnvSchema.parse(source);
  const tracing = startTracing(env, nodeEnv);
  const shutdown = async () => tracing?.shutdown();
  const dev = env.AI_DEV_PROVIDER !== undefined;
  if (!dev && !env.VERCEL_API_KEY) {
    log.warn({}, NO_AI_KEY);
    return { shutdown };
  }
  const deps = turnDeps({ db, env, nodeEnv, log, dev });
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
  env: z.infer<typeof workerEnvSchema>;
  nodeEnv: string;
  log: TurnWiring['log'];
  dev: boolean;
}

function turnDeps({ db, env, nodeEnv, log, dev }: DepsSources): TurnDeps {
  const gateway = createAiGateway({
    routes: dev ? GROQ_DEV_ROUTES : routeTable(env.AI_ROUTES),
    resolver: dev
      ? devModelResolver(env, nodeEnv === NodeEnv.production)
      : gatewayModelResolver(env),
    prices: PRICE_TABLE,
    caps: DEFAULT_CAPS,
    store: dbUsageStore(db),
    judgeProvider: env.TYPESAFE_API_KEY ? typeSafeJudge(env.TYPESAFE_API_KEY) : JUDGE_OFF,
  });
  return {
    respond: createConversationAgent({ db, gateway }),
    // ponytail: notices are logs until push exists (E-16); a release blocker (TASKS, E-16).
    notify: ({ tenantId, conversationId, reason }) => {
      log.warn({ tenantId, conversationId, reason }, NOTIFY_PENDING);
    },
    send: createChannelSender({
      accessToken: env.META_ACCESS_TOKEN,
      devFallback: nodeEnv !== NodeEnv.production,
      log: log.info,
    }),
  };
}
