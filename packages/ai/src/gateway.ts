import {
  generateText,
  stepCountIs,
  type ModelMessage,
  type SystemModelMessage,
  type ToolSet,
} from 'ai';
import { propagateAttributes } from '@langfuse/tracing';
import { assertWithinBudget, type Caps } from './budget.ts';
import { withFallback } from './fallback.ts';
import { judge, type JudgeProvider, type JudgeQuestions, type JudgeRequest } from './judge.ts';
import { modelKey, type ModelRef } from './models.ts';
import { costMicroUsd, priceFor, type PriceEntry, type TokenUsage } from './pricing.ts';
import { NO_RETENTION, type ModelResolver } from './providers.ts';
import { traceAttributes } from './trace-attributes.ts';
import { traceMasker } from './trace-masking.ts';
import { Task, type RouteTable } from './routing.ts';
import { transcribe, type TranscribeRequest } from './transcribe.ts';
import { JEV_MODEL } from './typesafe-judge.ts';
import type { UsageStore } from './usage-store.ts';
import { tokenUsage, usageColumns } from './usage.ts';

const JUDGE_TASK = 'judge';
const JUDGE_PROVIDER = 'typesafe';
const DEFAULT_MAX_STEPS = 5; // conversation agent, spec 04
const CONVERSATION_TASKS = new Set<Task>([Task.conversation, Task.conversationEscalated]);
// Stable prefix blocks are cached by the provider (Anthropic needs an explicit marker).
const CACHE_MARKER = { anthropic: { cacheControl: { type: 'ephemeral' } } } as const;
// Low reasoning effort on conversation: reasoning tokens are billed as output.
const LOW_REASONING = { reasoningEffort: 'low' } as const;

export interface CacheableBlock {
  text: string;
  cache: boolean;
}

export interface CallScope {
  tenantId: string;
  conversationId?: string;
  turnId?: string;
}

export interface GenerateRequest extends CallScope {
  task: Task;
  /** Ordered from the most stable to the most volatile. */
  system: readonly CacheableBlock[];
  messages: readonly ModelMessage[];
  tools?: ToolSet;
  maxSteps?: number;
  /** Names that appear in this call (contact, professional); masked in traces. */
  personalNames?: readonly string[];
}

export interface GenerateResult {
  text: string;
  /** Assistant and tool messages of this call, to append to the history of the next turn. */
  messages: readonly ModelMessage[];
  toolCalls: readonly unknown[];
  usage: TokenUsage;
  model: ModelRef;
  costMicroUsd: bigint;
}

export interface GatewayDeps {
  routes: RouteTable;
  resolver: ModelResolver;
  prices: readonly PriceEntry[];
  caps: Caps;
  store: UsageStore;
  judgeProvider: JudgeProvider;
  now?: () => Date;
}

export type AiGateway = ReturnType<typeof createAiGateway>;

interface Context {
  deps: GatewayDeps;
  now: () => Date;
}

export function createAiGateway(deps: GatewayDeps) {
  const ctx: Context = { deps, now: deps.now ?? (() => new Date()) };
  return {
    generate: (request: GenerateRequest) => generate(ctx, request),
    judge: <Q extends JudgeQuestions>(scope: CallScope, request: JudgeRequest<Q>) =>
      judgeAndRecord(ctx, scope, request),
    transcribe: (request: TranscribeRequest) =>
      transcribe(
        { route: deps.routes[Task.transcribe], resolver: deps.resolver, store: deps.store },
        request,
      ),
  };
}

async function generate({ deps, now }: Context, request: GenerateRequest) {
  const { tenantId, conversationId, turnId, task } = request;
  const monthStart = startOfMonth(now());
  assertWithinBudget(
    deps.caps,
    await deps.store.spend({ tenantId, conversationId, turnId, monthStart }),
  );

  traceMasker.remember(request.personalNames ?? []);
  // ponytail: a fallback after a write tool already ran could repeat it; E-13/E-20 make
  // write tools idempotent per turn before any write tool exists.
  const { value, model } = await propagateAttributes(traceAttributes(task, request), () =>
    withFallback(deps.routes[task], (ref, abortSignal) =>
      callModel(deps, request, { ref, abortSignal }),
    ),
  );
  const usage = tokenUsage(value.usage);
  const cost = costMicroUsd(priceFor(deps.prices, modelKey(model), now()), usage);
  await deps.store.record({
    tenantId,
    conversationId,
    turnId,
    task,
    ...usageColumns(model, usage, cost),
  });
  return {
    text: value.text,
    messages: value.responseMessages,
    toolCalls: value.toolCalls,
    usage,
    model,
    costMicroUsd: cost,
  } satisfies GenerateResult;
}

async function judgeAndRecord<Q extends JudgeQuestions>(
  { deps, now }: Context,
  scope: CallScope,
  request: JudgeRequest<Q>,
) {
  const result = await propagateAttributes(traceAttributes(JUDGE_TASK, scope), () =>
    judge(deps.judgeProvider, request),
  );
  if (!result.usage) return result.answers;
  const model = { provider: JUDGE_PROVIDER, model: JEV_MODEL } as unknown as ModelRef;
  const usage = {
    noCacheInput: result.usage.inputTokens,
    cacheRead: 0,
    cacheWrite: 0,
    output: result.usage.outputTokens,
  };
  const cost = costMicroUsd(priceFor(deps.prices, modelKey(model), now()), usage);
  await deps.store.record({ ...scope, task: JUDGE_TASK, ...usageColumns(model, usage, cost) });
  return result.answers;
}

interface Attempt {
  ref: ModelRef;
  abortSignal: AbortSignal;
}

function callModel(deps: GatewayDeps, request: GenerateRequest, { ref, abortSignal }: Attempt) {
  return generateText({
    model: deps.resolver.language(ref),
    instructions: systemMessages(request.system),
    messages: [...request.messages],
    ...(request.tools ? { tools: request.tools } : {}),
    stopWhen: stepCountIs(request.maxSteps ?? DEFAULT_MAX_STEPS),
    maxRetries: 0,
    abortSignal,
    providerOptions: {
      gateway: NO_RETENTION,
      ...(CONVERSATION_TASKS.has(request.task) ? { openai: LOW_REASONING } : {}),
    },
    telemetry: { functionId: request.task },
  });
}

function systemMessages(blocks: readonly CacheableBlock[]): SystemModelMessage[] {
  return blocks.map(({ text, cache }) => ({
    role: 'system',
    content: text,
    ...(cache ? { providerOptions: CACHE_MARKER } : {}),
  }));
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
