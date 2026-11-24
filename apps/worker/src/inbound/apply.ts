import { ChannelState, InboundKind, type InboundEvent } from '@app/channels';
import { ChannelStatus, MessageAuthor, MessageDirection, MessageStatus, type Tx } from '@app/db';
import { resolveContact } from './contacts.ts';
import { contentColumns } from './message-row.ts';

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
const CHANNEL_STATUS: Readonly<Record<ChannelState, ChannelStatus>> = {
  [ChannelState.connected]: ChannelStatus.connected,
  [ChannelState.disconnected]: ChannelStatus.disconnected,
  [ChannelState.restricted]: ChannelStatus.restricted,
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
 * Returns the delivery failures that need the operator (RF-25).
 */
export async function applyInboundEvents(
  tx: Tx,
  { tenantId, channelId, events }: InboundScope,
): Promise<DeliveryAlert[]> {
  const ordered = [...events].sort((a, b) => a.at.getTime() - b.at.getTime()); // RF-23: provider time
  const alerts: DeliveryAlert[] = [];
  for (const event of ordered) {
    if (event.kind === InboundKind.status) {
      await applyStatus(tx, channelId, event);
      if (event.error && ALERT_ERROR_CODES.has(event.error.code))
        alerts.push({ providerMessageId: event.providerMessageId, code: event.error.code });
    } else if (event.kind === InboundKind.channelState)
      await tx.channel.update({
        where: { id: channelId },
        data: { status: CHANNEL_STATUS[event.state] },
      });
    else await storeMessage(tx, { tenantId, channelId, event });
  }
  return alerts;
}

async function storeMessage(
  tx: Tx,
  { tenantId, channelId, event }: { tenantId: string; channelId: string; event: ConversationEvent },
) {
  const contact = await resolveContact(tx, tenantId, event.contact);
  const conversation = await tx.conversation.upsert({
    where: { tenantId_channelId_contactId: { tenantId, channelId, contactId: contact.id } },
    create: { tenantId, channelId, contactId: contact.id },
    update: {},
  });
  const fromPatient = event.kind === InboundKind.message;
  const { count } = await tx.message.createMany({
    data: messageRow({ tenantId, channelId, conversationId: conversation.id, event }),
    skipDuplicates: true, // unique (tenant, channel, provider_message_id): RF-22
  });
  if (count === 0) return;
  const latest =
    conversation.lastMessageAt && conversation.lastMessageAt > event.at
      ? conversation.lastMessageAt
      : event.at;
  await tx.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: latest,
      ...(fromPatient
        ? {
            unreadCount: { increment: 1 },
            windowExpiresAt: new Date(event.at.getTime() + WINDOW_MS),
          }
        : {}),
    },
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
