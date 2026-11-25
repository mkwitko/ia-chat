import { MetaCategory, summarizeMetaUsage, type MetaUsageSummary } from '@app/core';
import type { Tx } from '@app/db';

/**
 * H-05: the month's Meta usage of the tenant in scope (RLS filters), summarized with the
 * prices of packages/core. Counts only: no message content, no patient data.
 */
export async function readMetaSummary(tx: Tx, month: Date): Promise<MetaUsageSummary> {
  const groups = await tx.metaMessageUsage.groupBy({
    by: ['channelId', 'category', 'billable'],
    where: { month },
    _count: { _all: true },
  });
  return summarizeMetaUsage(
    groups.map((group) => ({
      channelId: group.channelId,
      category: MetaCategory[group.category],
      billable: group.billable,
      count: group._count._all,
    })),
  );
}
