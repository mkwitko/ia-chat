import type { InboundEvent, InboundKind } from '@app/channels';
import { monthOf } from '@app/core';
import { MetaCategory, type Tx } from '@app/db';

type StatusEvent = Extract<InboundEvent, { kind: typeof InboundKind.status }>;

const isCategory = (raw: string): raw is MetaCategory => raw in MetaCategory;

interface Scope {
  tenantId: string;
  channelId: string;
  event: StatusEvent;
}

/**
 * H-05: keeps what Meta says it charged for a delivered message. Statuses repeat (sent,
 * delivered, read), so the unique key (tenant, channel, message id) makes this idempotent.
 * Metadata only: never the message text.
 */
export async function recordMetaUsage(
  tx: Tx,
  { tenantId, channelId, event }: Scope,
): Promise<void> {
  const { pricing } = event;
  if (!pricing) return;
  await tx.metaMessageUsage.createMany({
    data: {
      tenantId,
      channelId,
      providerMessageId: event.providerMessageId,
      month: monthOf(event.at),
      category: isCategory(pricing.category) ? pricing.category : MetaCategory.other,
      billable: pricing.billable,
      pricingType: pricing.type ?? null,
    },
    skipDuplicates: true,
  });
}
