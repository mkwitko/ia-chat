import type { PriceEntry } from './pricing.ts';

// Micro-dollars per million tokens, from the Vercel AI Gateway catalog on 24/11/2026
// (provider list price, no markup). Prompts above 100k tokens cost more; ours stay below.
// On a price change, add a dated row instead of editing one.
const SINCE = '2026-11-24';

export const PRICE_TABLE: readonly PriceEntry[] = [
  {
    model: 'anthropic/claude-haiku-5.5',
    effectiveFrom: SINCE,
    input: 100_000,
    cacheRead: 10_000,
    cacheWrite: 125_000,
    output: 500_000,
  },
  {
    model: 'anthropic/claude-sonnet-5.5',
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
    cacheWrite: 125_000,
    output: 500_000,
  },
  {
    model: 'openai/gpt-6.1-terra',
    effectiveFrom: SINCE,
    input: 1_000_000,
    cacheRead: 50_000,
    cacheWrite: 1_250_000,
    output: 5_000_000,
  },
  {
    model: 'openai/gpt-6.2-sol',
    effectiveFrom: SINCE,
    input: 2_000_000,
    cacheRead: 100_000,
    cacheWrite: 2_500_000,
    output: 10_000_000,
  },
  // Google caches implicitly: no cache write price, billed as plain input.
  {
    model: 'google/gemini-3.8-flash',
    effectiveFrom: SINCE,
    input: 750_000,
    cacheRead: 75_000,
    cacheWrite: 750_000,
    output: 3_750_000,
  },
  {
    model: 'google/gemini-3.1-flash-lite',
    effectiveFrom: SINCE,
    input: 250_000,
    cacheRead: 30_000,
    cacheWrite: 250_000,
    output: 1_500_000,
  },
  // Groq free tier, development only: real usage is recorded at zero cost.
  ...['openai/gpt-oss-120b', 'openai/gpt-oss-20b'].map((model) => ({
    model: `groq/${model}`,
    effectiveFrom: SINCE,
    input: 0,
    cacheRead: 0,
    cacheWrite: 0,
    output: 0,
  })),
  // Jev (outside the gateway): input only, output free.
  {
    model: 'typesafe/jev-latest',
    effectiveFrom: SINCE,
    input: 42_000,
    cacheRead: 42_000,
    cacheWrite: 42_000,
    output: 0,
  },
];

/** Transcription is billed per minute of audio, in micro-dollars (US$ 0.000075 per second). */
export const TRANSCRIPTION_PRICE_PER_MINUTE: Readonly<Record<string, number>> = {
  'openai/gpt-transcribe': 4_500,
  'groq/whisper-large-v3-turbo': 0, // free tier, development only
};
