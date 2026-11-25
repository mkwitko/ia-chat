import { NodeEnv } from '@app/core';
import type { Db } from '@app/db';
import type { AiEnv } from './env.ts';
import { DEFAULT_CAPS } from './budget.ts';
import { createAiGateway } from './gateway.ts';
import { typeSafeJudge } from './typesafe-judge.ts';
import { PRICE_TABLE } from './prices.ts';
import { devModelResolver, gatewayModelResolver } from './providers.ts';
import { GROQ_DEV_ROUTES, routeTable } from './routing.ts';
import { dbUsageStore, type UsageStore } from './usage-store.ts';

const JUDGE_OFF = { ask: () => Promise.reject(new Error('TYPESAFE_API_KEY missing')) };

export interface EnvGatewayOptions {
  db: Db;
  env: AiEnv;
  nodeEnv: string;
  /** Defaults to ai_usage; the simulator wraps it to mark its rows. */
  store?: UsageStore;
}

/** True when the environment can call a model (the gateway key, or the free dev provider). */
export function aiConfigured(env: AiEnv): boolean {
  return env.AI_DEV_PROVIDER !== undefined || Boolean(env.VERCEL_API_KEY);
}

/** The production wiring of the gateway: the free Groq routes in development, else Vercel. */
export function createEnvGateway({ db, env, nodeEnv, store }: EnvGatewayOptions) {
  const dev = env.AI_DEV_PROVIDER !== undefined;
  return createAiGateway({
    routes: dev ? GROQ_DEV_ROUTES : routeTable(env.AI_ROUTES),
    resolver: dev
      ? devModelResolver(env, nodeEnv === NodeEnv.production)
      : gatewayModelResolver(env),
    prices: PRICE_TABLE,
    caps: DEFAULT_CAPS,
    store: store ?? dbUsageStore(db),
    judgeProvider: env.TYPESAFE_API_KEY ? typeSafeJudge(env.TYPESAFE_API_KEY) : JUDGE_OFF,
  });
}

/** Same spend and caps, but every row is tagged `prefix:task` and has no turn (spec 10, Simulador). */
export function markedStore(store: UsageStore, prefix: string): UsageStore {
  return {
    spend: (scope) => store.spend(scope),
    record: (entry) =>
      store.record({
        ...entry,
        task: `${prefix}:${entry.task}`,
        turnId: undefined,
        conversationId: undefined,
      }),
  };
}
