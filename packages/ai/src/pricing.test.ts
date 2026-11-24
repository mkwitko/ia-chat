import { describe, expect, it } from 'vitest';
import { costMicroUsd, priceFor, type PriceEntry } from './pricing.ts';

const MODEL = 'anthropic/claude-haiku-5-5';
const PRICES: PriceEntry[] = [
  {
    model: MODEL,
    effectiveFrom: '2026-01-01',
    input: 100_000,
    cacheRead: 10_000,
    cacheWrite: 125_000,
    output: 500_000,
  },
  {
    model: MODEL,
    effectiveFrom: '2026-12-01',
    input: 80_000,
    cacheRead: 8_000,
    cacheWrite: 100_000,
    output: 400_000,
  },
];

describe('priceFor', () => {
  it('picks the entry in force at the given date', () => {
    expect(priceFor(PRICES, MODEL, new Date('2026-11-24')).input).toBe(100_000);
    expect(priceFor(PRICES, MODEL, new Date('2026-12-02')).input).toBe(80_000);
  });

  it('refuses a model without a price instead of counting it as free', () => {
    expect(() => priceFor(PRICES, 'openai/unknown', new Date())).toThrow(/openai\/unknown/);
    expect(() => priceFor(PRICES, MODEL, new Date('2025-01-01'))).toThrow(/claude-haiku/);
  });
});

describe('costMicroUsd', () => {
  const [price] = PRICES as [PriceEntry, PriceEntry];

  it('charges uncached input, cache reads, cache writes and output separately', () => {
    // 1M uncached in = 100_000; 1M cache read = 10_000; 1M cache write = 125_000; 1M out = 500_000
    const usage = {
      noCacheInput: 1_000_000,
      cacheRead: 1_000_000,
      cacheWrite: 1_000_000,
      output: 1_000_000,
    };
    expect(costMicroUsd(price, usage)).toBe(735_000n);
  });

  it('rounds up so small calls are never free', () => {
    expect(costMicroUsd(price, { noCacheInput: 1, cacheRead: 0, cacheWrite: 0, output: 0 })).toBe(
      1n,
    );
    expect(costMicroUsd(price, { noCacheInput: 0, cacheRead: 0, cacheWrite: 0, output: 0 })).toBe(
      0n,
    );
  });
});
