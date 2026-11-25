import { monthOf, PLANS, PlanId, usageStatus } from '@app/core';
import { ChannelStatus, ControlReason, TurnState, type Db, type Prisma, type Tx } from '@app/db';

// Spec 07: real AI cost (ai_usage) against plan revenue. Aggregates only; no message content (RN-38).

/** Exchange rate of spec 07 (H-09): R$ 5,50 per dollar, as cents per micro-dollar x 1e6. */
const BRL_CENTS_PER_USD = 550n;
const MICRO_PER_USD = 1_000_000n;

export const microUsdToCents = (micro: bigint): number =>
  Number((micro * BRL_CENTS_PER_USD) / MICRO_PER_USD);

export function monthRange(at: Date): { from: Date; to: Date } {
  const from = monthOf(at);
  return { from, to: new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1)) };
}

export interface ClientRow {
  id: string;
  name: string;
  plan: string;
  status: string;
  channelConnected: boolean;
  conversations: number;
  franchise: number;
  revenueCents: number;
  costCents: number;
  marginCents: number;
  failedTurns: number;
  discardedTurns: number;
  handoffs: number;
}

/**
 * One row per tenant. Each tenant is read inside its own withTenant (RLS stays on), so the cost
 * is one short transaction per client. ponytail: fine for tens of clients (sequential); a SQL view when hundreds.
 */
export async function clientRows(db: Db, now: Date, only?: string): Promise<ClientRow[]> {
  const tenants = await db.client.tenant.findMany({
    ...(only ? { where: { id: only } } : {}),
    orderBy: { createdAt: 'asc' },
  });
  const rows: ClientRow[] = [];
  // One at a time: a parallel burst would starve the connection pool.
  for (const tenant of tenants) rows.push(await clientRow(db, tenant, now));
  return rows;
}

type TenantRow = Awaited<ReturnType<Db['client']['tenant']['findMany']>>[number];

export const NO_COST = 0n;

/** Conversations the assistant handed over (validation, safety) in the month, metadata only. */
export const handoffsIn = (inMonth: { gte: Date; lt: Date }) =>
  ({
    controlChangedAt: inMonth,
    controlReason: { in: [ControlReason.agentHandoff, ControlReason.safety] },
  }) satisfies Prisma.ConversationWhereInput;

function readMonth(tx: Tx, tenantId: string, now: Date) {
  const { from, to } = monthRange(now);
  const inMonth = { gte: from, lt: to };
  return Promise.all([
    tx.channel.count({ where: { status: ChannelStatus.connected } }),
    tx.usageCounter.findUnique({ where: { tenantId_month: { tenantId, month: from } } }),
    tx.aiUsage.aggregate({ where: { createdAt: inMonth }, _sum: { costMicroUsd: true } }),
    tx.turn.groupBy({ by: ['state'], where: { startedAt: inMonth }, _count: true }),
    tx.conversation.count({ where: handoffsIn(inMonth) }),
  ]);
}

async function clientRow(db: Db, tenant: TenantRow, now: Date): Promise<ClientRow> {
  const planId = PlanId[tenant.plan];
  const [channels, counter, usage, turns, handoffs] = await db.withTenant(tenant.id, (tx) =>
    readMonth(tx, tenant.id, now),
  );
  const conversations = counter?.conversations ?? 0;
  const status = usageStatus({ plan: planId, conversations, capCents: tenant.overageCapCents });
  const revenueCents = PLANS[planId].monthlyCents + status.overageCents;
  const costCents = microUsdToCents(usage._sum.costMicroUsd ?? NO_COST);
  const count = (state: TurnState) => turns.find((t) => t.state === state)?._count ?? 0;
  return {
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    status: tenant.status,
    channelConnected: channels > 0,
    conversations,
    franchise: status.franchise,
    revenueCents,
    costCents,
    marginCents: revenueCents - costCents,
    failedTurns: count(TurnState.failed),
    discardedTurns: count(TurnState.discarded),
    handoffs,
  };
}
