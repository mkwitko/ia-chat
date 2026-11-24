import { transcribe as transcribeAudio } from 'ai';
import { withFallback } from './fallback.ts';
import { modelKey, type ModelRef } from './models.ts';
import { TRANSCRIPTION_PRICE_PER_MINUTE } from './prices.ts';
import type { ModelResolver } from './providers.ts';
import type { Route } from './models.ts';
import type { UsageStore } from './usage-store.ts';

const TRANSCRIBE_TASK = 'transcribe';
const SECONDS_PER_MINUTE = 60;

export interface TranscribeRequest {
  tenantId: string;
  conversationId?: string;
  audio: Uint8Array;
}

export interface TranscribeDeps {
  route: Route;
  resolver: ModelResolver;
  store: UsageStore;
}

/** Audio to text (E-10 uses it), billed per minute, recorded in ai_usage. */
export async function transcribe(deps: TranscribeDeps, request: TranscribeRequest) {
  const { value, model } = await withFallback(deps.route, (ref, abortSignal) =>
    transcribeAudio({
      model: deps.resolver.transcription(ref),
      audio: request.audio,
      maxRetries: 0,
      abortSignal,
    }),
  );
  const seconds = value.durationInSeconds ?? 0;
  await deps.store.record({
    tenantId: request.tenantId,
    conversationId: request.conversationId,
    task: TRANSCRIBE_TASK,
    provider: model.provider,
    model: model.model,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    costMicroUsd: transcriptionCost(model, seconds),
  });
  return { text: value.text, seconds };
}

function transcriptionCost(model: ModelRef, seconds: number): bigint {
  const perMinute = TRANSCRIPTION_PRICE_PER_MINUTE[modelKey(model)];
  if (perMinute === undefined) throw new Error(`No transcription price for ${modelKey(model)}`);
  return BigInt(Math.ceil((seconds / SECONDS_PER_MINUTE) * perMinute));
}
