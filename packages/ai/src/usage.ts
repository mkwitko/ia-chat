import type { ModelRef } from './models.ts';
import type { TokenUsage } from './pricing.ts';

export interface SdkUsage {
  inputTokens: number | undefined;
  inputTokenDetails: {
    noCacheTokens?: number | undefined;
    cacheReadTokens?: number | undefined;
    cacheWriteTokens?: number | undefined;
  };
  outputTokens: number | undefined;
}

export function tokenUsage(usage: SdkUsage): TokenUsage {
  const cacheRead = usage.inputTokenDetails.cacheReadTokens ?? 0;
  const cacheWrite = usage.inputTokenDetails.cacheWriteTokens ?? 0;
  const noCacheInput =
    usage.inputTokenDetails.noCacheTokens ?? (usage.inputTokens ?? 0) - cacheRead - cacheWrite;
  return { noCacheInput, cacheRead, cacheWrite, output: usage.outputTokens ?? 0 };
}

export function usageColumns(model: ModelRef, usage: TokenUsage, cost: bigint) {
  return {
    provider: model.provider,
    model: model.model,
    inputTokens: usage.noCacheInput + usage.cacheRead + usage.cacheWrite,
    cachedInputTokens: usage.cacheRead,
    outputTokens: usage.output,
    costMicroUsd: cost,
  };
}
