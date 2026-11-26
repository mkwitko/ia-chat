import { generateText, Output } from 'ai';
import type * as z from 'zod';
import { assertWithinBudget } from './budget.ts';
import { withFallback } from './fallback.ts';
import type { GatewayDeps } from './gateway.ts';
import { modelKey, type ModelRef } from './models.ts';
import { costMicroUsd, priceFor } from './pricing.ts';
import { NO_RETENTION } from './providers.ts';
import type { Task } from './routing.ts';
import { tokenUsage, usageColumns } from './usage.ts';

const EXTRACT_TIMEOUT_MS = 30_000;

export interface ExtractRequest<T> {
  tenantId: string;
  task: Task;
  instructions: string;
  /** Data to read, never instructions (it may come from a web page). */
  input: string;
  schema: z.ZodType<T>;
}

/** One structured-output call (Zod schema), with the same budget and usage record as `generate`. */
export async function extractObject<T>(
  { deps, now }: { deps: GatewayDeps; now: () => Date },
  request: ExtractRequest<T>,
): Promise<T> {
  const { tenantId, task } = request;
  const monthStart = new Date(Date.UTC(now().getUTCFullYear(), now().getUTCMonth(), 1));
  assertWithinBudget(deps.caps, await deps.store.spend({ tenantId, monthStart }));
  const { value, model } = await withFallback(
    deps.routes[task],
    (ref: ModelRef, abortSignal) =>
      generateText({
        model: deps.resolver.language(ref),
        instructions: request.instructions,
        prompt: request.input,
        output: Output.object({ schema: request.schema }),
        maxRetries: 0,
        abortSignal,
        providerOptions: { gateway: NO_RETENTION },
        telemetry: { functionId: task },
      }),
    { timeoutMs: EXTRACT_TIMEOUT_MS },
  );
  const usage = tokenUsage(value.usage);
  const cost = costMicroUsd(priceFor(deps.prices, modelKey(model), now()), usage);
  await deps.store.record({ tenantId, task, ...usageColumns(model, usage, cost) });
  return value.output;
}
