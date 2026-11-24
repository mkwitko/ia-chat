import {
  ConversationControl,
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '../../generated/prisma/enums.ts';
import { Prisma } from '../../generated/prisma/client.ts';
import type { Tx } from '../index.ts';

// Spec 03, "Trava de envio": every outbound message (worker turn, panel, draft approval)
// takes the conversation row lock first and checks control and turn_version.

export interface LockedConversation {
  control: ConversationControl;
  turnVersion: number;
}

/** `select ... for update` on the conversation row; holds until the transaction ends. */
export async function lockConversation(
  tx: Tx,
  conversationId: string,
): Promise<LockedConversation | null> {
  const [row] = await tx.$queryRaw<{ control: ConversationControl; turn_version: number }[]>(
    Prisma.sql`select control, turn_version from conversations where id = ${conversationId}::uuid for update`,
  );
  return row ? { control: row.control, turnVersion: row.turn_version } : null;
}

/** The lock passes only for the assistant's turn: control 'ai' and the version it read. */
export function turnMayDeliver(locked: LockedConversation | null, version: number): boolean {
  return locked?.control === ConversationControl.ai && locked.turnVersion === version;
}

export interface OutboundRecord {
  tenantId: string;
  conversationId: string;
  author: MessageAuthor;
  text: string;
  providerMessageId: string;
}

/** Stores a sent message and settles the conversation (nothing pending, read, last activity). */
export async function recordOutbound(tx: Tx, record: OutboundRecord): Promise<void> {
  const { tenantId, conversationId, author, text, providerMessageId } = record;
  const conversation = await tx.conversation.update({
    where: { id: conversationId },
    data: { pendingSince: null, unreadCount: 0, lastMessageAt: new Date() },
  });
  await tx.message.create({
    data: {
      tenantId,
      channelId: conversation.channelId,
      conversationId,
      direction: MessageDirection.outbound,
      author,
      type: MessageType.text,
      text,
      providerMessageId,
      providerTimestamp: new Date(),
      status: MessageStatus.sent,
    },
  });
}
