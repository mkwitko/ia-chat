/** Price per million tokens, in micro-dollars (US$ 1 = 1_000_000). Versioned by date. */
export interface PriceEntry {
  /** "provider/model", see modelKey(). */
  model: string;
  /** ISO date from which this price applies. */
  effectiveFrom: string;
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
}

export interface TokenUsage {
  noCacheInput: number;
  cacheRead: number;
  cacheWrite: number;
  /** Includes reasoning tokens, billed as output. */
  output: number;
}

const TOKENS_PER_PRICE_UNIT = 1_000_000;

export class UnknownPriceError extends Error {
  constructor(model: string, at: Date) {
    super(`No price for ${model} at ${at.toISOString()}`);
  }
}

/** The entry in force at `at`. A model without a price is an error, never free. */
export function priceFor(prices: readonly PriceEntry[], model: string, at: Date): PriceEntry {
  const inForce = prices
    .filter((p) => p.model === model && new Date(p.effectiveFrom) <= at)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const [current] = inForce;
  if (!current) throw new UnknownPriceError(model, at);
  return current;
}

/** Cost in micro-dollars, rounded up so no call is recorded as free. */
export function costMicroUsd(price: PriceEntry, usage: TokenUsage): bigint {
  const total =
    usage.noCacheInput * price.input +
    usage.cacheRead * price.cacheRead +
    usage.cacheWrite * price.cacheWrite +
    usage.output * price.output;
  return BigInt(Math.ceil(total / TOKENS_PER_PRICE_UNIT));
}
