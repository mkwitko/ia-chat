/** Spend caps in micro-dollars (docs/spec/04-agentes-e-ia.md). */
export interface Caps {
  turn: bigint;
  conversation: bigint;
  tenantMonth: bigint;
}

export type Spend = Caps;
export type BudgetScope = keyof Caps;

export const DEFAULT_CAPS: Caps = {
  turn: 50_000n, // US$ 0.05
  conversation: 300_000n, // US$ 0.30
  tenantMonth: 15_000_000n, // US$ 15, conservative default (spec 04, hypothesis)
};

const SCOPES: readonly BudgetScope[] = ['turn', 'conversation', 'tenantMonth'];

export class BudgetExceededError extends Error {
  readonly scope: BudgetScope;

  constructor(scope: BudgetScope) {
    super(`AI budget exceeded: ${scope}`);
    this.scope = scope;
  }
}

/** Checked before every call. Reaching a cap stops the call (the turn hands off). */
export function assertWithinBudget(caps: Caps, spend: Spend): void {
  const exceeded = SCOPES.find((scope) => spend[scope] >= caps[scope]);
  if (exceeded) throw new BudgetExceededError(exceeded);
}
