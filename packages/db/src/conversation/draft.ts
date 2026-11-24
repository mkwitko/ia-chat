import { ConversationControl, TurnState } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';

// RF-13, "aprovar antes de enviar": the assistant's answer waits in turns.draft_text.

export interface PendingDraft {
  turnId: string;
  text: string;
  /** turn_version the draft was written for. */
  version: number;
}

/**
 * The draft still worth approving: written for the current turn_version while the assistant
 * has the conversation. A new patient message or a change of control makes it stale (A-03).
 */
export async function findPendingDraft(
  tx: Tx,
  conversationId: string,
): Promise<PendingDraft | null> {
  const conversation = await tx.conversation.findUnique({
    where: { id: conversationId },
    select: { control: true, turnVersion: true },
  });
  if (conversation?.control !== ConversationControl.ai) return null;
  const turn = await tx.turn.findFirst({
    where: { conversationId, state: TurnState.draft, version: conversation.turnVersion },
    orderBy: { startedAt: 'desc' },
  });
  if (!turn?.draftText) return null;
  return { turnId: turn.id, text: turn.draftText, version: turn.version };
}
