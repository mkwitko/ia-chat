import { describe, expect, it } from 'vitest';
import { BudgetExceededError, DEFAULT_CAPS, assertWithinBudget, type Spend } from './budget.ts';

const nothingSpent: Spend = { turn: 0n, conversation: 0n, tenantMonth: 0n };

describe('assertWithinBudget', () => {
  it('lets a call through while every cap has room', () => {
    expect(() => {
      assertWithinBudget(DEFAULT_CAPS, nothingSpent);
    }).not.toThrow();
  });

  it.each([
    ['turn', { ...nothingSpent, turn: DEFAULT_CAPS.turn }],
    ['conversation', { ...nothingSpent, conversation: DEFAULT_CAPS.conversation }],
    ['tenantMonth', { ...nothingSpent, tenantMonth: DEFAULT_CAPS.tenantMonth }],
  ] as const)('blocks when the %s cap is reached', (scope, spend) => {
    expect(() => {
      assertWithinBudget(DEFAULT_CAPS, spend);
    }).toThrow(BudgetExceededError);
    try {
      assertWithinBudget(DEFAULT_CAPS, spend);
    } catch (error) {
      expect((error as BudgetExceededError).scope).toBe(scope);
    }
  });

  it('uses the spec values: US$ 0.05 per turn, US$ 0.30 per conversation', () => {
    expect(DEFAULT_CAPS.turn).toBe(50_000n);
    expect(DEFAULT_CAPS.conversation).toBe(300_000n);
  });
});
