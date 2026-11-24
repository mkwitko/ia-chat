// E-07: runs the evaluation battery on the candidate models and writes docs/eval/<date>.md.
//   pnpm eval                              all candidates, all cases, Jev
//   pnpm eval --models haiku,luna --cases agendar,urgencia-01 --skip-judge
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DEFAULT_CAPS } from '../src/budget.ts';
import { aiEnvSchema } from '../src/env.ts';
import { createAiGateway } from '../src/gateway.ts';
import type { ModelRef } from '../src/models.ts';
import { PRICE_TABLE } from '../src/prices.ts';
import { gatewayModelResolver } from '../src/providers.ts';
import { DEFAULT_ROUTES } from '../src/routing.ts';
import { startTracing } from '../src/tracing.ts';
import { typeSafeJudge } from '../src/typesafe-judge.ts';
import { CANDIDATES } from './candidates.ts';
import { runConversation } from './conversation.ts';
import { CASES } from './data/cases.ts';
import { evaluateJudge } from './judge-eval.ts';
import { memoryUsageStore } from './memory-store.ts';
import { createMeter } from './meter.ts';
import { mapPool } from './pool.ts';
import { renderReport } from './report.ts';
import { summarize } from './summary.ts';

const CONCURRENCY = 6;
const MICRO = 1_000_000;
const COST_DIGITS = 4;
const REPORT_DIR = new URL('../../../docs/eval/', import.meta.url);
const { values } = parseArgs({
  options: {
    models: { type: 'string' },
    cases: { type: 'string' },
    'skip-judge': { type: 'boolean' },
    label: { type: 'string' },
    repeat: { type: 'string' },
  },
});

const env = aiEnvSchema.parse(process.env);
const tracing = startTracing(env, 'eval');
const resolver = gatewayModelResolver(env);
const store = memoryUsageStore();
const meter = createMeter();
const noJudge = {
  ask: () => Promise.reject(new Error('judge is not part of the conversation battery')),
};

const models = (values.models?.split(',') ?? Object.keys(CANDIDATES)).map((name) => {
  const model = CANDIDATES[name];
  if (!model) throw new Error(`unknown model ${name}; use ${Object.keys(CANDIDATES).join(', ')}`);
  return model;
});
const filters = values.cases?.split(',');
const selected = filters
  ? CASES.filter((item) => filters.some((filter) => item.id === filter || item.category === filter))
  : CASES;
// --repeat N runs each case N times: five cases per category are few against run-to-run noise.
const cases = Array.from({ length: Number(values.repeat ?? 1) }, () => selected).flat();

// Models run side by side; each one keeps its own pool of conversations.
const perModel = await Promise.all(
  models.map(async (model) => {
    const gateway = createAiGateway({
      routes: { ...DEFAULT_ROUTES, conversation: { primary: model } },
      resolver,
      prices: PRICE_TABLE,
      caps: DEFAULT_CAPS,
      store,
      judgeProvider: noJudge,
    });
    const tenantId = crypto.randomUUID(); // one tenant per model: the monthly cap stays per model
    return mapPool(cases, CONCURRENCY, async (item) => {
      const result = await runConversation({ gateway, resolver, meter, tenantId }, item, model);
      const status = result.failures.length ? 'FALHOU' : 'ok    ';
      const reasons = result.failures.length ? ' — ' + result.failures.join('; ') : '';
      console.log(`${status} ${label(model)} ${item.id}${reasons}`);
      return result;
    });
  }),
);
const results = perModel.flat();
const summaries = models.map((model, index) =>
  summarize(model, perModel[index] ?? [], { cases, usage: store.entries }),
);

const judge =
  !values['skip-judge'] && env.TYPESAFE_API_KEY
    ? await evaluateJudge(typeSafeJudge(env.TYPESAFE_API_KEY))
    : null;
const date = new Date().toISOString().slice(0, 'AAAA-MM-DD'.length);
const markdown = renderReport({
  date,
  cases,
  summaries,
  results,
  judge,
  harnessCostUsd: Number(meter.total()) / MICRO,
});
mkdirSync(REPORT_DIR, { recursive: true });
const suffix = values.label ? '-' + values.label : '';
const file = new URL(`${date}${suffix}.md`, REPORT_DIR);
writeFileSync(file, markdown);
for (const s of summaries)
  console.log(
    `${s.model}: ${String(s.passed)}/${String(s.total)}, critério ${s.meetsCriteria ? 'sim' : 'não'}, US$ ${s.avgCostUsd.toFixed(COST_DIGITS)} por conversa`,
  );
if (judge) console.log(`Jev: ${judge.passed ? 'passou' : 'não passou'}`);
console.log(`relatório: ${file.pathname}`);
await tracing?.shutdown();

function label(model: ModelRef): string {
  return `${model.provider}/${model.model}`.padEnd('anthropic/claude-sonnet-5.5'.length);
}
