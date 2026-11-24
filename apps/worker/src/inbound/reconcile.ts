import { MessageDirection, MessageStatus, type Db } from '@app/db';

const STALE_AFTER_MS = 3_600_000; // RF-26: 1 hour without a delivery status

export interface StaleMessages {
  tenantId: string;
  count: number;
  oldest: Date;
}

/**
 * RF-26: outbound messages still "sent" or "pending" an hour later, per tenant, for the
 * operator. Ids and counts only, never content (RN-38).
 */
export async function findStaleMessages(db: Db, now: Date): Promise<StaleMessages[]> {
  const before = new Date(now.getTime() - STALE_AFTER_MS);
  const tenants = await db.client.tenant.findMany({ select: { id: true } });
  const found: StaleMessages[] = [];
  for (const { id: tenantId } of tenants) {
    const stale = await db.withTenant(tenantId, (tx) =>
      tx.message.aggregate({
        where: {
          direction: MessageDirection.outbound,
          status: { in: [MessageStatus.sent, MessageStatus.pending] },
          createdAt: { lt: before },
        },
        _count: { _all: true },
        _min: { createdAt: true },
      }),
    );
    if (stale._count._all > 0 && stale._min.createdAt)
      found.push({ tenantId, count: stale._count._all, oldest: stale._min.createdAt });
  }
  return found;
}
