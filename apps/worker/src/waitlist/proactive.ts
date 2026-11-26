import {
  ConversationControl,
  MessageAuthor,
  lockConversation,
  proactiveGate,
  recordOutbound,
  type Tx,
} from '@app/db';
import type { ReminderChannel } from '../reminders/deliver.ts';

// M-09: the one path of the waitlist offer and the no-show message. Unlike a reminder, these are
// new conversation turns: they pass the opt-out gate (M-01), go out only while the assistant holds
// the conversation (RF-31, send lock) and only as free text inside the 24 h window. No UTILITY
// template is approved for them yet (E-00b): outside the window the professional is told instead.

export const ProactiveOutcome = {
  sent: 'sent',
  optOut: 'opt_out',
  noConversation: 'no_conversation',
  humanControl: 'human_control',
  windowClosed: 'window_closed',
} as const;
export type ProactiveOutcome = (typeof ProactiveOutcome)[keyof typeof ProactiveOutcome];

export interface ProactiveResult {
  outcome: ProactiveOutcome;
  conversationId: string | null;
}

export interface ProactiveMessage {
  tenantId: string;
  contactId: string;
  text: string;
  now: Date;
}

export async function sendProactive(
  tx: Tx,
  { message, channel }: { message: ProactiveMessage; channel: Pick<ReminderChannel, 'send'> },
): Promise<ProactiveResult> {
  const { tenantId, contactId, text, now } = message;
  const gate = await proactiveGate(tx, { contactId, now });
  if (!gate.ok) return { outcome: ProactiveOutcome.optOut, conversationId: null };
  const conversation = await tx.conversation.findFirst({
    where: { contactId },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    select: { id: true },
  });
  if (!conversation) return { outcome: ProactiveOutcome.noConversation, conversationId: null };
  const conversationId = conversation.id;
  const locked = await lockConversation(tx, conversationId);
  if (locked?.control !== ConversationControl.ai)
    return { outcome: ProactiveOutcome.humanControl, conversationId };
  const { windowExpiresAt } = await tx.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { windowExpiresAt: true },
  });
  if (!windowExpiresAt || windowExpiresAt <= now)
    return { outcome: ProactiveOutcome.windowClosed, conversationId };
  const { providerMessageId } = await channel.send(tx, { conversationId, text });
  await recordOutbound(tx, {
    tenantId,
    conversationId,
    author: MessageAuthor.system,
    text,
    providerMessageId,
  });
  return { outcome: ProactiveOutcome.sent, conversationId };
}

/** The professional hears about it when the message could not go out but a person can act. */
export const tellsProfessional = (outcome: ProactiveOutcome): boolean =>
  outcome === ProactiveOutcome.humanControl || outcome === ProactiveOutcome.windowClosed;
