import type { Db } from '@app/db';
import type { Spend } from './budget.ts';

export interface UsageEntry {
  tenantId: string;
  conversationId?: string | undefined;
  turnId?: string | undefined;
  task: string;
  provider: string;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costMicroUsd: bigint;
}

export interface SpendScope {
  tenantId: string;
  conversationId?: string | undefined;
  turnId?: string | undefined;
  monthStart: Date;
}

export interface UsageStore {
  record(entry: UsageEntry): Promise<void>;
  spend(scope: SpendScope): Promise<Spend>;
}

/** ai_usage in Postgres, always inside withTenant. */
const NOTHING_SPENT = 0n;

export function dbUsageStore(db: Db): UsageStore {
  return {
    async record({ tenantId, conversationId, turnId, ...entry }) {
      const data = {
        tenantId,
        conversationId: conversationId ?? null,
        turnId: turnId ?? null,
        ...entry,
      };
      await db.withTenant(tenantId, (tx) => tx.aiUsage.create({ data }));
    },
    async spend({ tenantId, conversationId, turnId, monthStart }) {
      return db.withTenant(tenantId, async (tx) => {
        const sum = async (where: object) =>
          (await tx.aiUsage.aggregate({ _sum: { costMicroUsd: true }, where }))._sum.costMicroUsd ??
          NOTHING_SPENT;
        return {
          turn: turnId ? await sum({ turnId }) : NOTHING_SPENT,
          conversation: conversationId ? await sum({ conversationId }) : NOTHING_SPENT,
          tenantMonth: await sum({ createdAt: { gte: monthStart } }),
        };
      });
    },
  };
}
