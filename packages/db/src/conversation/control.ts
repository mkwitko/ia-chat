import {
  ConversationControl,
  ScheduledMessageKind,
  ScheduledMessageState,
} from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';

// Spec 03, "Controle da conversa" (RF-30 to RF-34): who answers the patient, and why.

export const ControlReason = {
  ownerEcho: 'owner_echo',
  dashboard: 'dashboard',
  agentHandoff: 'agent_handoff',
  safety: 'safety',
  system: 'system',
  pauseExpired: 'pause_expired',
} as const;
export type ControlReason = (typeof ControlReason)[keyof typeof ControlReason];

export const ActorType = {
  user: 'user',
  system: 'system',
  assistant: 'assistant',
  operator: 'operator',
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

const AUDIT_ACTION = 'conversation.control_changed';
const AUDIT_ENTITY = 'conversation';

export interface ControlChange {
  tenantId: string;
  conversationId: string;
  to: ConversationControl;
  reason: ControlReason;
  actor: { type: ActorType; id?: string | undefined };
}

/**
 * Changes who answers, in the caller's transaction. Bumps turn_version so any turn in
 * flight is discarded at the send lock (A-03, A-04). Returns false when nothing changed.
 */
export async function setControl(tx: Tx, change: ControlChange): Promise<boolean> {
  const current = await tx.conversation.findUniqueOrThrow({ where: { id: change.conversationId } });
  if (current.control === change.to) return false;
  await tx.conversation.update({
    where: { id: change.conversationId },
    data: {
      control: change.to,
      controlReason: change.reason,
      controlChangedAt: new Date(),
      pauseExpiresAt: null,
      // A-06: back with the assistant, nothing old is pending; only the next message counts.
      pendingSince: null,
      turnVersion: { increment: 1 },
    },
  });
  if (change.to === ConversationControl.human) await suspendFollowUps(tx, change.conversationId);
  await tx.auditLog.create({
    data: {
      tenantId: change.tenantId,
      actorType: change.actor.type,
      actorId: change.actor.id ?? null,
      action: AUDIT_ACTION,
      entity: AUDIT_ENTITY,
      entityId: change.conversationId,
      before: { control: current.control, reason: current.controlReason },
      after: { control: change.to, reason: change.reason },
    },
  });
  return true;
}

/** RF-31: in human control, follow-ups of the conversation stop; appointment reminders go on. */
async function suspendFollowUps(tx: Tx, conversationId: string): Promise<void> {
  await tx.scheduledMessage.updateMany({
    where: {
      conversationId,
      kind: ScheduledMessageKind.follow_up,
      state: ScheduledMessageState.scheduled,
    },
    data: { state: ScheduledMessageState.cancelled },
  });
}
