// E-06 "pronto quando", against real providers (needs keys in .env):
//   1. a real call records tokens and cost in ai_usage;
//   2. the primary model forced to fail falls back to the other model;
//   3. judge with the provider down returns null without throwing.
import { randomUUID } from 'node:crypto';
import { parseEnv } from '@app/core';
import { createDb } from '@app/db';
import { APICallError } from 'ai';
import { DEFAULT_CAPS } from '../src/budget.ts';
import { aiEnvSchema } from '../src/env.ts';
import { createAiGateway } from '../src/gateway.ts';
import { PRICE_TABLE } from '../src/prices.ts';
import { gatewayModelResolver, type ModelResolver } from '../src/providers.ts';
import { Task, routeTable } from '../src/routing.ts';
import { startTracing } from '../src/tracing.ts';
import { typeSafeJudge } from '../src/typesafe-judge.ts';
import { dbUsageStore } from '../src/usage-store.ts';

const SERVICE_UNAVAILABLE = 503;
const { DATABASE_URL } = parseEnv(process.env);
const env = aiEnvSchema.parse(process.env);
const tracing = startTracing(env, 'development');
const FICTITIOUS_NAME = 'Joana Exemplo';
const FICTITIOUS_PHONE = '(11) 90000-0001';
const db = createDb(DATABASE_URL);
const routes = routeTable(env.AI_ROUTES);
const real = gatewayModelResolver(env);
const judgeDown = { ask: () => Promise.reject(new Error('provider down (simulated)')) };
const deps = { routes, prices: PRICE_TABLE, caps: DEFAULT_CAPS, store: dbUsageStore(db) };

const tenant = await db.client.tenant.create({
  data: { name: 'Smoke IA (fictício)', slug: `smoke-${randomUUID()}` },
});
const request = {
  task: Task.conversation,
  tenantId: tenant.id,
  system: [{ text: 'Responda em uma frase curta, em português.', cache: true }],
  messages: [
    {
      role: 'user' as const,
      content: `Sou ${FICTITIOUS_NAME}, meu telefone é ${FICTITIOUS_PHONE}. Diga olá usando meu nome.`,
    },
  ],
  personalNames: [FICTITIOUS_NAME],
};

const live = createAiGateway({ ...deps, resolver: real, judgeProvider: judgeDown });
const first = await live.generate(request);
console.log('1. real call:', first.model, first.usage, `${String(first.costMicroUsd)} micro-USD`);

const primary = routes[Task.conversation].primary;
const failingPrimary: ModelResolver = {
  ...real,
  language: (ref) => {
    if (ref !== primary) return real.language(ref);
    throw new APICallError({
      message: 'forced failure',
      url: 'smoke',
      requestBodyValues: {},
      statusCode: SERVICE_UNAVAILABLE,
    });
  },
};
const second = await createAiGateway({
  ...deps,
  resolver: failingPrimary,
  judgeProvider: judgeDown,
})
  .generate(request)
  .catch((error: unknown) => ({ error: String(error) }));
console.log('2. primary forced to fail:', 'model' in second ? second.model : second);

const down = await live.judge(
  { tenantId: tenant.id },
  { state: { text: 'oi' }, questions: { urgent: { kind: 'noul', instructions: 'É urgente?' } } },
);
console.log('3. judge with provider down:', down);

if (env.TYPESAFE_API_KEY) {
  const jev = createAiGateway({
    ...deps,
    resolver: real,
    judgeProvider: typeSafeJudge(env.TYPESAFE_API_KEY),
  });
  const answers = await jev.judge(
    { tenantId: tenant.id },
    {
      state: { message: `${FICTITIOUS_NAME} aqui: estou com muita dor no peito agora` },
      questions: {
        urgent: { kind: 'noul', instructions: 'A mensagem descreve uma emergência médica?' },
      },
    },
  );
  console.log('4. Jev, real:', answers);
}

const rows = await db.withTenant(tenant.id, (tx) => tx.aiUsage.findMany());
console.log(
  'ai_usage rows:',
  rows.map((r) => `${r.task} ${r.model} ${String(r.costMicroUsd)}`),
);
await db.client.$disconnect();
await tracing?.shutdown();
console.log('traces:', tracing ? 'sent to Langfuse' : 'off (no LANGFUSE keys)');
