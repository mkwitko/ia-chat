import { InboundKind, type ChannelState, type InboundEvent } from '@app/channels';
import {
  ActorType,
  ControlReason,
  ConversationControl,
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  setControl,
  syncStage,
  type Tx,
} from '@app/db';
import { onPatientMessage, type TurnRequest } from '../conversation/schedule.ts';
import { applyChannelState } from './channel-state.ts';
import { resolveContact } from './contacts.ts';
import { countMessage, MessageCategory, type UsageNotice } from '../usage/counters.ts';
import { contentColumns } from './message-row.ts';
import { mediaToFetch } from './media-request.ts';
import { recordMetaUsage } from './meta-usage.ts';

const WINDOW_MS = 86_400_000; // Meta customer service window: 24 h from the patient's last message
type ConversationEvent = Extract<
  InboundEvent,
  { kind: typeof InboundKind.message | typeof InboundKind.ownerEcho }
>;
type StatusEvent = Extract<InboundEvent, { kind: typeof InboundKind.status }>;

// A status only moves forward; failed replaces a message not yet delivered.
const STATUS_RANK: Readonly<Record<MessageStatus, number>> = {
  [MessageStatus.received]: 0,
  [MessageStatus.pending]: 0,
  [MessageStatus.sent]: 1,
  [MessageStatus.delivered]: 2,
  [MessageStatus.read]: 3,
  [MessageStatus.failed]: 2,
};

// RF-25: failures the operator must see. 131047: 24 h window expired; 131042: payment issue.
const ALERT_ERROR_CODES = new Set(['131047', '131042']);

export interface DeliveryAlert {
  providerMessageId: string;
  code: string;
}

export interface InboundScope {
  tenantId: string;
  channelId: string;
  events: readonly InboundEvent[];
}

/**
 * Applies normalized events inside the tenant transaction. Safe to run again (A-01).
 * Returns the delivery failures that need the operator (RF-25) and the turns to schedule.
 */
export interface InboundResult {
  alerts: DeliveryAlert[];
  /** Turns to schedule after the transaction commits (E-11). */
  turns: TurnRequest[];
  /** Franchise warnings to push after the transaction commits (E-18). */
  usage: UsageNotice[];
  /** Messages whose media the media job must fetch (E-10), queued after commit. */
  media: string[];
  /** A connected channel went down (RF-29): alert and push after commit. */
  channelDown: boolean;
}

export async function applyInboundEvents(
  tx: Tx,
  { tenantId, channelId, events }: InboundScope,
): Promise<InboundResult> {
  const ordered = [...events].sort((a, b) => a.at.getTime() - b.at.getTime()); // RF-23: provider time
  const result: InboundResult = { alerts: [], turns: [], usage: [], media: [], channelDown: false };
  for (const event of ordered) await applyOne(tx, { tenantId, channelId, event, result });
  return result;
}

/** RF-29: a drop is reported once per batch, after commit. */
async function applyStateEvent(
  tx: Tx,
  { channelId, state, result }: { channelId: string; state: ChannelState; result: InboundResult },
): Promise<void> {
  const down = await applyChannelState(tx, channelId, state);
  if (down) result.channelDown = true;
}

interface ApplyOne {
  tenantId: string;
  channelId: string;
  event: InboundEvent;
  result: InboundResult;
}

async function applyOne(tx: Tx, { tenantId, channelId, event, result }: ApplyOne): Promise<void> {
  if (event.kind === InboundKind.channelState) {
    await applyStateEvent(tx, { channelId, state: event.state, result });
    return;
  }
  if (event.kind !== InboundKind.status) {
    const stored = await storeMessage(tx, { tenantId, channelId, event });
    await syncStage(tx, { tenantId, contactId: stored.contactId, now: new Date() });
    if (stored.turn) result.turns.push(stored.turn);
    if (stored.usage) result.usage.push(stored.usage);
    if (stored.media) result.media.push(stored.media);
    return;
  }
  await applyStatus(tx, channelId, event);
  await recordMetaUsage(tx, { tenantId, channelId, event });
  if (event.error && ALERT_ERROR_CODES.has(event.error.code))
    result.alerts.push({ providerMessageId: event.providerMessageId, code: event.error.code });
}

interface StoreMessage {
  tenantId: string;
  channelId: string;
  event: ConversationEvent;
}

interface Stored {
  contactId: string;
  turn: TurnRequest | null;
  usage: UsageNotice | null;
  media: string | null;
}

async function storeMessage(tx: Tx, { tenantId, channelId, event }: StoreMessage): Promise<Stored> {
  const contact = await resolveContact(tx, tenantId, event.contact);
  // Logs a time-based "não agendou" before this message brings the contact back.
  await syncStage(tx, { tenantId, contactId: contact.id, now: new Date() });
  const conversation = await tx.conversation.upsert({
    where: { tenantId_channelId_contactId: { tenantId, channelId, contactId: contact.id } },
    create: { tenantId, channelId, contactId: contact.id },
    update: {},
  });
  // One clock for the row and the turn window: the turn claims messages by created_at.
  const now = new Date();
  const { count } = await tx.message.createMany({
    data: {
      ...messageRow({ tenantId, channelId, conversationId: conversation.id, event }),
      createdAt: now,
    },
    skipDuplicates: true, // unique (tenant, channel, provider_message_id): RF-22
  });
  if (count === 0) return { contactId: contact.id, turn: null, usage: null, media: null };
  const media = await mediaToFetch(tx, { channelId, providerMessageId: event.providerMessageId });
  const fromPatient = event.kind === InboundKind.message;
  const usage = await countMessage(tx, {
    tenantId,
    conversationId: conversation.id,
    category: fromPatient ? MessageCategory.patient : MessageCategory.owner,
    opensConversation: fromPatient && opensConversation(conversation.lastMessageAt, event.at),
    now,
  });
  const updated = await touchConversation(tx, conversation, event);
  if (fromPatient)
    return { contactId: contact.id, turn: await onPatientMessage(tx, updated, now), usage, media };
  // RF-30: the owner answered from the phone; same transaction as the message.
  await setControl(tx, {
    tenantId,
    conversationId: conversation.id,
    to: ConversationControl.human,
    reason: ControlReason.ownerEcho,
    actor: { type: ActorType.user },
  });
  return { contactId: contact.id, turn: null, usage, media };
}

/** Spec 01: a new conversation starts after more than 24 h without messages. */
const opensConversation = (last: Date | null, at: Date) =>
  !last || at.getTime() - last.getTime() > WINDOW_MS;

async function touchConversation(
  tx: Tx,
  conversation: { id: string; lastMessageAt: Date | null },
  event: ConversationEvent,
) {
  const latest =
    conversation.lastMessageAt && conversation.lastMessageAt > event.at
      ? conversation.lastMessageAt
      : event.at;
  const patient =
    event.kind === InboundKind.message
      ? { unreadCount: { increment: 1 }, windowExpiresAt: new Date(event.at.getTime() + WINDOW_MS) }
      : {};
  return tx.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: latest, ...patient },
  });
}

function messageRow({
  event,
  ...ids
}: {
  tenantId: string;
  channelId: string;
  conversationId: string;
  event: ConversationEvent;
}) {
  const fromPatient = event.kind === InboundKind.message;
  return {
    ...ids,
    ...contentColumns(event.content),
    direction: fromPatient ? MessageDirection.inbound : MessageDirection.outbound,
    author: fromPatient ? MessageAuthor.patient : MessageAuthor.human,
    status: fromPatient ? MessageStatus.received : MessageStatus.sent,
    providerMessageId: event.providerMessageId,
    providerTimestamp: event.at,
  };
}

async function applyStatus(tx: Tx, channelId: string, event: StatusEvent): Promise<void> {
  const status = MessageStatus[event.status];
  const lower = (Object.keys(STATUS_RANK) as MessageStatus[]).filter(
    (candidate) => STATUS_RANK[candidate] < STATUS_RANK[status],
  );
  await tx.message.updateMany({
    where: { channelId, providerMessageId: event.providerMessageId, status: { in: lower } },
    data: { status, errorCode: event.error?.code ?? null },
  });
}
