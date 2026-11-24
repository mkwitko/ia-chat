// Stops a battery before it spends more than allowed or after the gateway runs out of
// credit (E-07 lesson: a run kept calling until the balance hit zero).

const OUT_OF_CREDIT = /credit balance|insufficient (?:funds|credit)/i;
export const MICRO_PER_USD = 1_000_000;
const CENTS_DIGITS = 2;

export function createSpendGuard(maxUsd: number, spentMicroUsd: () => bigint) {
  const max = BigInt(Math.round(maxUsd * MICRO_PER_USD));
  let reason: string | null = null;
  return {
    /** Why the run must stop, or null to go on. */
    stopReason(): string | null {
      if (reason === null && spentMicroUsd() >= max)
        reason = `teto de US$ ${maxUsd.toFixed(CENTS_DIGITS)} atingido`;
      return reason;
    },
    observe(failures: readonly string[]): void {
      if (failures.some((failure) => OUT_OF_CREDIT.test(failure))) reason ??= 'gateway sem crédito';
    },
  };
}
