import { describe, expect, it } from 'vitest';
import { createSpendGuard } from './spend-guard.ts';

describe('spend guard', () => {
  it('stops at the cap', () => {
    let spent = 0n;
    const guard = createSpendGuard(1, () => spent);
    expect(guard.stopReason()).toBeNull();
    spent = 1_000_000n;
    expect(guard.stopReason()).toBe('teto de US$ 1.00 atingido');
  });

  it('stops after an out-of-credit error', () => {
    const guard = createSpendGuard(1, () => 0n);
    guard.observe(['erro: A positive credit balance is required for all requests']);
    expect(guard.stopReason()).toBe('gateway sem crédito');
  });
});
