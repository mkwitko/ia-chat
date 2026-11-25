import { randomUUID } from 'node:crypto';
import { createDb } from '@app/db';
import { APICallError } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { afterAll, describe, expect, it } from 'vitest';
import { BudgetExceededError, DEFAULT_CAPS } from './budget.ts';
import { createAiGateway, type GatewayDeps } from './gateway.ts';
import type { JudgeProvider } from './judge.ts';
import { Provider } from './models.ts';
import { PRICE_TABLE } from './prices.ts';
import type { ModelResolver } from './providers.ts';
import { DEFAULT_ROUTES, Task } from './routing.ts';
import { dbUsageStore } from './usage-store.ts';

// E-06 with fake models on the real database: usage and cost recorded, fallback, caps, fail-safe judge.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

// Fixed routes: the test checks the mechanics, not the production model choice.
const ROUTES = {
  ...DEFAULT_ROUTES,
  [Task.conversation]: {
    primary: { provider: Provider.anthropic, model: 'claude-haiku-5.5' },
    fallback: { provider: Provider.openai, model: 'gpt-6-luna' },
  },
};
const usage = {
  inputTokens: { total: 1_000, noCache: 400, cacheRead: 600, cacheWrite: 0 },
  outputTokens: { total: 200, text: 200, reasoning: 0 },
};
const answer = (text: string) =>
  new MockLanguageModelV3({
    doGenerate: () =>
      Promise.resolve({
        finishReason: { unified: 'stop', raw: 'stop' },
        usage,
        content: [{ type: 'text', text }],
        warnings: [],
      }),
  });
const down = new MockLanguageModelV3({
  doGenerate: () =>
    Promise.reject(
      new APICallError({ message: 'overloaded', url: 'x', requestBodyValues: {}, statusCode: 529 }),
    ),
});

function resolverWith(byProvider: Partial<Record<Provider, MockLanguageModelV3>>): ModelResolver {
  return {
    language: (ref) => byProvider[ref.provider] ?? answer('unexpected'),
    transcription: () => {
      throw new Error('not used');
    },
  };
}

async function newTenant(): Promise<string> {
  const tenant = await db.client.tenant.create({
    data: { name: 'IA teste', slug: `ia-${randomUUID()}` },
  });
  return tenant.id;
}

function gateway(overrides: Partial<GatewayDeps>) {
  const judgeProvider: JudgeProvider = { ask: () => Promise.reject(new Error('down')) };
  return createAiGateway({
    routes: ROUTES,
    resolver: resolverWith({ [Provider.anthropic]: answer('olá') }),
    prices: PRICE_TABLE,
    caps: DEFAULT_CAPS,
    store: dbUsageStore(db),
    judgeProvider,
    ...overrides,
  });
}

const request = (tenantId: string) => ({
  task: Task.conversation,
  tenantId,
  system: [{ text: 'Você é a recepção.', cache: true }],
  messages: [{ role: 'user' as const, content: 'quanto custa?' }],
});

async function usageRows(tenantId: string) {
  return db.withTenant(tenantId, (tx) => tx.aiUsage.findMany({ orderBy: { createdAt: 'asc' } }));
}

describe('AI gateway', () => {
  it('records tokens and cost of every call in ai_usage', async () => {
    const tenantId = await newTenant();
    const result = await gateway({}).generate(request(tenantId));
    expect(result.text).toBe('olá');
    // Haiku: 400 in × 0.10 + 600 cache × 0.01 + 200 out × 0.50 = 146 micro-dollars
    expect(result.costMicroUsd).toBe(146n);
    expect(await usageRows(tenantId)).toMatchObject([
      {
        model: 'claude-haiku-5.5',
        inputTokens: 1_000,
        cachedInputTokens: 600,
        outputTokens: 200,
        costMicroUsd: 146n,
      },
    ]);
  });

  it('falls back to the other provider when the primary model fails', async () => {
    const tenantId = await newTenant();
    const resolver = resolverWith({
      [Provider.anthropic]: down,
      [Provider.openai]: answer('reserva'),
    });
    const result = await gateway({ resolver }).generate(request(tenantId));
    expect(result.text).toBe('reserva');
    expect((await usageRows(tenantId)).map((row) => row.model)).toEqual(['gpt-6-luna']);
  });

  it('refuses the call once the tenant cap is reached, without calling the model', async () => {
    const tenantId = await newTenant();
    const caps = { ...DEFAULT_CAPS, tenantMonth: 1n };
    const model = answer('olá');
    const capped = gateway({ caps, resolver: resolverWith({ [Provider.anthropic]: model }) });
    await capped.generate(request(tenantId));
    await expect(capped.generate(request(tenantId))).rejects.toThrow(BudgetExceededError);
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it('judge with the provider down returns null and does not throw', async () => {
    const tenantId = await newTenant();
    const answers = await gateway({}).judge(
      { tenantId },
      { state: { text: 'oi' }, questions: { urgent: { kind: 'noul', instructions: 'Urgente?' } } },
    );
    expect(answers).toEqual({ urgent: null });
  });

  it('judge records usage with only the ids, even when the caller passes a whole turn', async () => {
    const tenantId = await newTenant();
    const judgeProvider: JudgeProvider = {
      ask: () =>
        Promise.resolve({
          answers: { urgent: { kind: 'noul', probability: 0.1 } },
          usage: { inputTokens: 100, outputTokens: 10 },
        }),
    };
    const turn = { tenantId, messages: [{ text: 'conteúdo do paciente' }] };
    await gateway({ judgeProvider }).judge(turn, {
      state: { text: 'oi' },
      questions: { urgent: { kind: 'noul', instructions: 'Urgente?' } },
    });
    const rows = await db.withTenant(tenantId, (tx) => tx.aiUsage.findMany());
    expect(rows).toHaveLength(1);
  });
});
