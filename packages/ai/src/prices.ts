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
};
