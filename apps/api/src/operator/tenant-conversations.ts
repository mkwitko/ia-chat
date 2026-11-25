import { TurnState, type Tx } from '@app/db';
import { handoffsIn, microUsdToCents, monthRange, NO_COST } from './overview.ts';

const LIST_LIMIT = 50;

export interface ConversationCost {
  conversationId: string;
  costCents: number;
}
export interface TurnIssue {
  conversationId: string;
  state: string;
  turns: number;
}
export interface Handoff {
  conversationId: string;
  reason: string | null;
}

/** Per-conversation cost and problems of the month: ids, states and numbers, never content (RN-38). */
export async function tenantConversations(tx: Tx, now: Date) {
  const { from, to } = monthRange(now);
  const inMonth = { gte: from, lt: to };
  const [costs, issues, handoffs] = await Promise.all([
    tx.aiUsage.groupBy({
      by: ['conversationId'],
      where: { createdAt: inMonth, conversationId: { not: null } },
      _sum: { costMicroUsd: true },
    }),
    tx.turn.groupBy({
      by: ['conversationId', 'state'],
      where: { startedAt: inMonth, state: { in: [TurnState.failed, TurnState.discarded] } },
      _count: true,
    }),
    tx.conversation.findMany({
      where: handoffsIn(inMonth),
      select: { id: true, controlReason: true },
      take: LIST_LIMIT,
    }),
  ]);
  return {
    costs: costsOf(costs),
    issues: issues.slice(0, LIST_LIMIT).map(({ conversationId, state, _count }): TurnIssue => ({
      conversationId,
      state,
      turns: _count,
    })),
    handoffs: handoffs.map(({ id, controlReason }): Handoff => ({
      conversationId: id,
      reason: controlReason,
    })),
  };
}

function costsOf(
  groups: { conversationId: string | null; _sum: { costMicroUsd: bigint | null } }[],
): ConversationCost[] {
  return groups
    .flatMap(({ conversationId, _sum }): ConversationCost[] =>
      conversationId
        ? [{ conversationId, costCents: microUsdToCents(_sum.costMicroUsd ?? NO_COST) }]
        : [],
    )
    .sort((a, b) => b.costCents - a.costCents)
    .slice(0, LIST_LIMIT);
}
