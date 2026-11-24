import type { LanguageModelUsage } from 'ai';
import { modelKey, type ModelRef } from '../src/models.ts';
import { PRICE_TABLE } from '../src/prices.ts';
import { costMicroUsd, priceFor } from '../src/pricing.ts';
import { tokenUsage } from '../src/usage.ts';
import { NOW } from './data/clinic.ts';

/** Cost of the calls made outside the gateway (simulator and grader), in micro-dollars. */
export function createMeter() {
  let total = 0n;
  return {
    add(model: ModelRef, usage: LanguageModelUsage): void {
      total += costMicroUsd(priceFor(PRICE_TABLE, modelKey(model), NOW), tokenUsage(usage));
    },
    total: () => total,
  };
}

export type Meter = ReturnType<typeof createMeter>;
