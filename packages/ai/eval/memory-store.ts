import type { Spend } from '../src/budget.ts';
import type { SpendScope, UsageEntry, UsageStore } from '../src/usage-store.ts';

const NOTHING = 0n;

/** ai_usage in memory, for the battery: same caps, nothing written to the database. */
export function memoryUsageStore(): UsageStore & { entries: UsageEntry[] } {
  const entries: UsageEntry[] = [];
  const sum = (filter: (entry: UsageEntry) => boolean) =>
    entries.filter(filter).reduce((total, entry) => total + entry.costMicroUsd, NOTHING);
  return {
    entries,
    record(entry) {
      entries.push(entry);
      return Promise.resolve();
    },
    spend({ tenantId, conversationId, turnId }: SpendScope): Promise<Spend> {
      return Promise.resolve({
        turn: turnId ? sum((entry) => entry.turnId === turnId) : NOTHING,
        conversation: conversationId
          ? sum((entry) => entry.conversationId === conversationId)
          : NOTHING,
        tenantMonth: sum((entry) => entry.tenantId === tenantId),
      });
    },
  };
}
