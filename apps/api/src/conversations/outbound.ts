import type { ChannelSend } from '@app/channels';
import {
  ActorType,
  ControlReason,
  ConversationControl,
  findPendingDraft,
  lockConversation,
  MessageAuthor,
  recordOutbound,
  setControl,
  TurnState,
  type Tx,
} from '@app/db';

// Everything the professional sends from the panel passes the send lock (spec 03, "Trava de
// envio"): row locked with `select ... for update`, state checked, then sent and recorded.

export const OutboundResult = {
  sent: 'sent',
  discarded: 'discarded',
  notFound: 'not_found',
  /** The draft is no longer the one waiting: a patient message or a change of control came first. */
  stale: 'stale',
} as const;
export type OutboundResult = (typeof OutboundResult)[keyof typeof OutboundResult];

export const DraftAction = { approve: 'approve', edit: 'edit', discard: 'discard' } as const;
export type DraftAction = (typeof DraftAction)[keyof typeof DraftAction];

interface Who {
  tenantId: string;
  userId: string;
  conversationId: string;
}

/** Free text from the panel. Sending takes the conversation over (spec 10, "Conversa"). */
export async function sendFromPanel(
  tx: Tx,
  { who, text, send }: { who: Who; text: string; send: ChannelSend },
): Promise<OutboundResult> {
  const locked = await lockConversation(tx, who.conversationId);
  if (!locked) return OutboundResult.notFound;
  if (locked.control === ConversationControl.ai) await takeOver(tx, who);
  await deliver(tx, { who, text, author: MessageAuthor.human, send });
  return OutboundResult.sent;
}

export interface DraftDecision {
  who: Who;
  action: DraftAction;
  turnId: string;
  /** Required by `edit`. */
  text?: string | undefined;
  send: ChannelSend;
}

/**
 * Approve, edit or discard the assistant's draft (RF-13). The draft counts only while its
 * turn_version is still the conversation's, checked under the lock: a stale draft is refused.
 */
export async function decideDraft(tx: Tx, decision: DraftDecision): Promise<OutboundResult> {
  const { who, action, turnId, send } = decision;
  const locked = await lockConversation(tx, who.conversationId);
  if (!locked) return OutboundResult.notFound;
  const draft = await findPendingDraft(tx, who.conversationId);
  if (draft?.turnId !== turnId || draft.version !== locked.turnVersion) return OutboundResult.stale;
  if (action === DraftAction.discard) {
    await tx.conversation.update({
      where: { id: who.conversationId },
      data: { pendingSince: null },
    });
    await tx.turn.update({ where: { id: turnId }, data: { state: TurnState.discarded } });
    return OutboundResult.discarded;
  }
  const edited = action === DraftAction.edit;
  const text = edited ? (decision.text ?? draft.text) : draft.text;
  const author = edited ? MessageAuthor.human : MessageAuthor.ai;
  await deliver(tx, { who, text, author, send });
  await tx.turn.update({ where: { id: turnId }, data: { state: TurnState.sent } });
  return OutboundResult.sent;
}

async function takeOver(tx: Tx, who: Who): Promise<void> {
  await setControl(tx, {
    tenantId: who.tenantId,
    conversationId: who.conversationId,
    to: ConversationControl.human,
    reason: ControlReason.dashboard,
    actor: { type: ActorType.user, id: who.userId },
  });
}

async function deliver(
  tx: Tx,
  input: { who: Who; text: string; author: MessageAuthor; send: ChannelSend },
): Promise<void> {
  const { who, text, author, send } = input;
  const { providerMessageId } = await send(tx, { conversationId: who.conversationId, text });
  await recordOutbound(tx, {
    tenantId: who.tenantId,
    conversationId: who.conversationId,
    author,
    text,
    providerMessageId,
  });
}
