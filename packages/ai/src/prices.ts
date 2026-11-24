import type { PriceEntry } from './pricing.ts';

// Micro-dollars per million tokens. Source: spec 04 (research of 24/11/2026).
// Cache write is not in the research: Anthropic charged 1.25x input; OpenAI does not charge it.
// Re-check against each provider's page before the evaluation (E-07); add a dated row on change.
const SINCE = '2026-11-24';

export const PRICE_TABLE: readonly PriceEntry[] = [
  {
    model: 'anthropic/claude-haiku-5-5',
    effectiveFrom: SINCE,
    input: 100_000,
    cacheRead: 10_000,
    cacheWrite: 125_000,
    output: 500_000,
  },
  {
    model: 'anthropic/claude-sonnet-5-5',
    effectiveFrom: SINCE,
    input: 2_000_000,
    cacheRead: 100_000,
    cacheWrite: 2_500_000,
    output: 10_000_000,
  },
  {
    model: 'openai/gpt-6-luna',
    effectiveFrom: SINCE,
    input: 100_000,
    cacheRead: 10_000,
    cacheWrite: 100_000,
    output: 500_000,
  },
  {
    model: 'openai/gpt-6.1-terra',
    effectiveFrom: SINCE,
    input: 1_000_000,
    cacheRead: 50_000,
    cacheWrite: 1_000_000,
    output: 5_000_000,
  },
  // Jev: input only, output free.
  {
    model: 'typesafe/jev-latest',
    effectiveFrom: SINCE,
    input: 42_000,
    cacheRead: 42_000,
    cacheWrite: 42_000,
    output: 0,
  },
  // Free development quota.
  {
    model: 'workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    effectiveFrom: SINCE,
    input: 0,
    cacheRead: 0,
    cacheWrite: 0,
    output: 0,
  },
];

/** Transcription is billed per minute of audio, in micro-dollars. */
export const TRANSCRIPTION_PRICE_PER_MINUTE: Readonly<Record<string, number>> = {
  'groq/whisper-large-v3-turbo': 670,
  'openai/gpt-4o-mini-transcribe': 3_000,
};
