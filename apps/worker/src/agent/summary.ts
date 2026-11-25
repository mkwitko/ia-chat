import { Task, type AiGateway } from '@app/ai';
import type { Db, Tx } from '@app/db';
import { healthGuard, type EventLog } from './health-guard.ts';
import { HISTORY_LIMIT } from './context.ts';

const INSTRUCTIONS =
  'Resuma em até 5 frases o que já foi tratado nesta conversa de recepção de consultório: pedidos, horários combinados, dúvidas pendentes. Não inclua informação de saúde. Responda só com o resumo.';
const SUMMARY_TARGET = 'conversations.summary';
const PREVIOUS = 'Resumo anterior:';

export interface SummaryDeps {
  db: Db;
  gateway: AiGateway;
  log: EventLog;
}

interface Scope {
  tenantId: string;
  conversationId: string;
}

/**
 * Spec 04: history beyond the last 20 messages becomes a summary, stored on the
 * conversation and extended only when more messages fall out of the window.
 */
export async function refreshSummary(deps: SummaryDeps, scope: Scope): Promise<void> {
  const { db, gateway } = deps;
  const older = await db.withTenant(scope.tenantId, (tx) =>
    messagesOutOfWindow(tx, scope.conversationId),
  );
  if (!older) return;
  const transcript = older.messages.map(lineOf).join('\n');
  const { text } = await gateway.generate({
    task: Task.summarize,
    ...scope,
    system: [{ text: INSTRUCTIONS, cache: true }],
    messages: [
      {
        role: 'user',
        content: older.previous
          ? [PREVIOUS, older.previous, '', transcript].join('\n')
          : transcript,
      },
    ],
  });
  // M-03: a summary with health information is not kept; the window still moves on.
  const blocked = await healthGuard({ gateway, log: deps.log, scope })(text, SUMMARY_TARGET);
  const until = older.messages.at(-1)?.createdAt ?? null;
  await db.withTenant(scope.tenantId, (tx) =>
    tx.conversation.update({
      where: { id: scope.conversationId },
      data: { summary: blocked ? null : text, summaryUntil: until },
    }),
  );
}

async function messagesOutOfWindow(tx: Tx, conversationId: string) {
  const conversation = await tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  const window = await tx.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
    select: { createdAt: true },
  });
  const oldestKept = window.at(-1)?.createdAt;
  if (window.length < HISTORY_LIMIT || !oldestKept) return null;
  const after = conversation.summaryUntil ?? new Date(0);
  const messages = await tx.message.findMany({
    where: { conversationId, createdAt: { gt: after, lt: oldestKept } },
    orderBy: { createdAt: 'asc' },
  });
  return messages.length ? { messages, previous: conversation.summary } : null;
}

function lineOf(message: { author: string; type: string; text: string | null }): string {
  return message.author + ': ' + (message.text ?? '[' + message.type + ']');
}
