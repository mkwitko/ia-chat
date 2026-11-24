import {
  ActorType,
  ControlReason,
  ConversationControl,
  MessageAuthor,
  MessageDirection,
  setControl,
  type Tx,
} from '@app/db';

// RF-35 and RF-36: the assistant passes the conversation to the professional, tells the
// patient, and the professional is reminded while nobody answers.

export const HANDOFF_NOTICE =
  'Vou passar sua mensagem para o profissional, que vai te responder por aqui assim que puder.';
/** RF-36 default: 2 hours. ponytail: counts wall-clock time; business hours come with E-16 settings. */
export const HANDOFF_REMINDER_DELAY_MS = 7_200_000;

export interface Handoff {
  /** Text for the caller to send to the patient (through the send lock path). */
  notice: string;
  channelId: string;
}

export async function handOff(
  tx: Tx,
  { tenantId, conversationId }: { tenantId: string; conversationId: string },
): Promise<Handoff> {
  await setControl(tx, {
    tenantId,
    conversationId,
    to: ConversationControl.human,
    reason: ControlReason.agentHandoff,
    actor: { type: ActorType.assistant },
  });
  const { channelId } = await tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  return { notice: HANDOFF_NOTICE, channelId };
}

/** True while the handoff stands and the professional has not written since it. */
export async function needsHandoffReminder(tx: Tx, conversationId: string): Promise<boolean> {
  const conversation = await tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  if (
    conversation.control !== ConversationControl.human ||
    conversation.controlReason !== ControlReason.agentHandoff
  )
    return false;
  const answered = await tx.message.count({
    where: {
      conversationId,
      direction: MessageDirection.outbound,
      author: MessageAuthor.human,
      createdAt: { gt: conversation.controlChangedAt },
    },
  });
  return answered === 0;
}
