import { monthOf, PlanId, usageStatus } from '@app/core';
import { Prisma, type Tx } from '@app/db';
import { NotifyReason } from '../notify/reasons.ts';

// E-18: conversations per month and messages by category (spec 01, "Controle de custo
// imprevisível"). A conversation is a run of messages with one patient, no gap over 24 h.

export const MessageCategory = { patient: 'patient', owner: 'owner' } as const;
export type MessageCategory = (typeof MessageCategory)[keyof typeof MessageCategory];

const NOT_RETURNED = 'usage counter not returned';

export interface UsageNotice {
  reason: typeof NotifyReason.usageWarning | typeof NotifyReason.usageFull;
  conversationId: string;
}

interface CounterRow {
  conversations: number;
  warned_80_at: Date | null;
  warned_100_at: Date | null;
}

export interface MessageCount {
  tenantId: string;
  conversationId: string;
  category: MessageCategory;
  /** The message opened a new conversation (no message with this patient in the last 24 h). */
  opensConversation: boolean;
  now: Date;
}

/** Same transaction as the stored message. Returns the warning to push after the commit. */
export async function countMessage(tx: Tx, input: MessageCount): Promise<UsageNotice | null> {
  const row = await increment(tx, input);
  if (!input.opensConversation) return null;
  const { plan, overageCapCents } = await tx.tenant.findUniqueOrThrow({
    where: { id: input.tenantId },
    select: { plan: true, overageCapCents: true },
  });
  const status = usageStatus({
    plan: PlanId[plan],
    conversations: row.conversations,
    capCents: overageCapCents,
  });
  const alreadySent = status.full ? row.warned_100_at : row.warned_80_at;
  if (!status.warning || alreadySent) return null;
  await tx.usageCounter.update({
    where: { tenantId_month: { tenantId: input.tenantId, month: monthOf(input.now) } },
    data: { warned80At: input.now, ...(status.full ? { warned100At: input.now } : {}) },
  });
  return {
    reason: status.full ? NotifyReason.usageFull : NotifyReason.usageWarning,
    conversationId: input.conversationId,
  };
}

async function increment(tx: Tx, input: MessageCount): Promise<CounterRow> {
  const { tenantId, category, now } = input;
  const opened = input.opensConversation ? 1 : 0;
  const [row] = await tx.$queryRaw<CounterRow[]>(Prisma.sql`
    insert into usage_counters (tenant_id, month, conversations, messages_by_category)
    values (${tenantId}::uuid, ${monthOf(now)}::date, ${opened}, jsonb_build_object(${category}::text, 1))
    on conflict (tenant_id, month) do update set
      conversations = usage_counters.conversations + ${opened},
      messages_by_category = usage_counters.messages_by_category || jsonb_build_object(
        ${category}::text,
        coalesce((usage_counters.messages_by_category ->> ${category}::text)::int, 0) + 1)
    returning conversations, warned_80_at, warned_100_at`);
  if (!row) throw new Error(NOT_RETURNED);
  return row;
}
