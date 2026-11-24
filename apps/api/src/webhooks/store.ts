import { createHash } from 'node:crypto';
import type { InboundBatch } from '@app/channels';
import type { Db, Prisma } from '@app/db';

export const CLOUD_PROVIDER = 'whatsapp_cloud';
const HASH = 'sha256';

/** Hands a stored batch to the worker (pg-boss in production, a spy in tests). */
export type EnqueueInbound = (tenantId: string, inboundEventId: string) => Promise<void>;

export const StoreOutcome = { stored: 'stored', unknownAccount: 'unknown_account' } as const;
export type StoreOutcome = (typeof StoreOutcome)[keyof typeof StoreOutcome];

/**
 * RF-21: keeps this account's raw part in its tenant's inbound_events and queues it. A
 * redelivered webhook has the same hash and is not queued twice while unprocessed.
 */
export async function storeBatch(
  db: Db,
  batch: InboundBatch,
  enqueue: EnqueueInbound,
): Promise<StoreOutcome> {
  const route = await db.client.channelRoute.findUnique({ where: { accountId: batch.accountId } });
  if (!route) return StoreOutcome.unknownAccount;
  const payload = batch.raw as Prisma.InputJsonValue;
  const payloadHash = createHash(HASH).update(JSON.stringify(payload)).digest('hex');
  const stored = await db.withTenant(route.tenantId, (tx) =>
    tx.inboundEvent.upsert({
      where: { tenantId_payloadHash: { tenantId: route.tenantId, payloadHash } },
      create: {
        tenantId: route.tenantId,
        channelId: route.channelId,
        provider: CLOUD_PROVIDER,
        payload,
        payloadHash,
      },
      update: {},
    }),
  );
  if (!stored.processedAt) await enqueue(route.tenantId, stored.id);
  return StoreOutcome.stored;
}
