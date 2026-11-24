import { ActorType, ControlReason, ConversationControl, setControl, type Tx } from '@app/db';

// Spec 03, "Agrupamento de entrada": the turn runs 6 s after the latest message, never
// later than 20 s after the first unanswered one.
const QUIET_MS = 6000;
const MAX_WAIT_MS = 20_000;

export interface TurnRequest {
  conversationId: string;
  /** turn_version when the job was asked for; an older job finds a newer version and skips. */
  version: number;
  delayMs: number;
}

export function turnDelayMs(now: Date, pendingSince: Date): number {
  const cap = pendingSince.getTime() + MAX_WAIT_MS - now.getTime();
  return Math.max(0, Math.min(QUIET_MS, cap));
}

interface ConversationState {
  id: string;
  tenantId: string;
  control: ConversationControl;
  pauseExpiresAt: Date | null;
  pendingSince: Date | null;
}

/** A new patient message: bump the version and ask for a turn, unless a human is answering (A-05). */
export async function onPatientMessage(
  tx: Tx,
  conversation: ConversationState,
  now: Date,
): Promise<TurnRequest | null> {
  if (conversation.control === ConversationControl.human) {
    if (!conversation.pauseExpiresAt || conversation.pauseExpiresAt > now) return null;
    // RF-32: optional pause expiry, off unless the tenant set pause_expires_at.
    await setControl(tx, {
      tenantId: conversation.tenantId,
      conversationId: conversation.id,
      to: ConversationControl.ai,
      reason: ControlReason.pauseExpired,
      actor: { type: ActorType.system },
    });
  }
  const pendingSince =
    conversation.control === ConversationControl.human ? now : (conversation.pendingSince ?? now);
  const updated = await tx.conversation.update({
    where: { id: conversation.id },
    data: { turnVersion: { increment: 1 }, pendingSince },
  });
  return {
    conversationId: conversation.id,
    version: updated.turnVersion,
    delayMs: turnDelayMs(now, pendingSince),
  };
}
