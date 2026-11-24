import type { MessageType, Tx } from '@app/db';
import type { Clock } from './clock.ts';

/** Spec 03: sent when generation passes 45 s; the professional is notified. */
export const BUSY_MESSAGE = 'Só um instante, já te respondo.';

export const TurnOutcome = {
  stale: 'stale',
  sent: 'sent',
  aborted: 'aborted',
  draft: 'draft',
  skipped: 'skipped',
  discarded: 'discarded',
} as const;
export type TurnOutcome = (typeof TurnOutcome)[keyof typeof TurnOutcome];

/** RF-13: send now, or keep as a draft for the professional to approve. */
export const DeliveryMode = { send: 'send', draft: 'draft' } as const;
export type DeliveryMode = (typeof DeliveryMode)[keyof typeof DeliveryMode];

export interface TurnMessage {
  id: string;
  type: MessageType;
  text: string | null;
}

export interface TurnReply {
  text: string;
  model: string;
  costMicroUsd: bigint;
  mode: DeliveryMode;
  /** The assistant handed off (RF-35): control goes to the professional after this answer. */
  handoff: boolean;
}

export interface RespondInput {
  tenantId: string;
  conversationId: string;
  turnId: string;
  messages: readonly TurnMessage[];
}

/** The assistant (E-13) and the channel (E-09) seen from the turn. */
export interface TurnDeps {
  /** null: nothing to answer (a lone sticker); the pending messages are settled. */
  respond: (input: RespondInput) => Promise<TurnReply | null>;
  send: (
    tx: Tx,
    input: { conversationId: string; text: string },
  ) => Promise<{ providerMessageId: string }>;
  /** Marks the patient's last message read and shows "typing" (spec 03, step 1). */
  typing?: (input: {
    tenantId: string;
    conversationId: string;
    providerMessageId: string;
  }) => Promise<void>;
  /** Tells the professional (push in E-16; a log until then). */
  notify?: (input: { tenantId: string; conversationId: string; reason: string }) => void;
  clock?: Clock;
}

export interface TurnJob {
  tenantId: string;
  conversationId: string;
  version: number;
}
