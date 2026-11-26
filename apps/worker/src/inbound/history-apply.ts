import { ContactAction, InboundKind, type InboundEvent } from '@app/channels';
import { MESSAGE_TEXT_RETENTION_DAYS } from '@app/core';
import {
  HistoryImportState,
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  type Tx,
} from '@app/db';
import { upsertContact } from './contacts.ts';
import { contentColumns } from './message-row.ts';

// E-24b, spec 03 "Histórico da coexistência": what the `history` and `smb_app_state_sync` webhooks
// bring is stored as read-only context. Messages are flagged `imported`: they never open a turn,
// never count as a conversation, never move the unread count or the control, and the assistant
// never reads them. Nothing is imported unless the owner authorized it in the panel (`requested`).

const MS_PER_DAY = 86_400_000;
const PERCENT_DONE = 100;

export type HistoryEvent = Extract<
  InboundEvent,
  {
    kind:
      | typeof InboundKind.historyMessage
      | typeof InboundKind.historyProgress
      | typeof InboundKind.historyDeclined
      | typeof InboundKind.contactSync;
  }
>;

// `done` stays open: chunks may arrive out of order, and later phone-book changes keep coming.
const AUTHORIZED: ReadonlySet<HistoryImportState> = new Set([
  HistoryImportState.requested,
  HistoryImportState.done,
]);

const HISTORY_KINDS: ReadonlySet<string> = new Set([
  InboundKind.historyMessage,
  InboundKind.historyProgress,
  InboundKind.historyDeclined,
  InboundKind.contactSync,
]);

export const isHistoryEvent = (event: InboundEvent): event is HistoryEvent =>
  HISTORY_KINDS.has(event.kind);

export interface HistoryScope {
  tenantId: string;
  channelId: string;
  events: readonly HistoryEvent[];
}

export async function applyHistoryEvents(
  tx: Tx,
  { tenantId, channelId, events }: HistoryScope,
): Promise<void> {
  if (events.length === 0) return;
  const channel = await tx.channel.findUniqueOrThrow({
    where: { id: channelId },
    select: { historyImport: true },
  });
  if (!AUTHORIZED.has(channel.historyImport)) return;
  const cutoff = Date.now() - MESSAGE_TEXT_RETENTION_DAYS * MS_PER_DAY;
  for (const event of events) {
    if (event.kind === InboundKind.historyMessage) {
      if (event.at.getTime() >= cutoff) await importMessage(tx, { tenantId, channelId, event });
    } else if (event.kind === InboundKind.contactSync) {
      await importContact(tx, tenantId, event);
    } else {
      await recordProgress(tx, channelId, event);
    }
  }
}

type MessageEvent = Extract<HistoryEvent, { kind: typeof InboundKind.historyMessage }>;

async function importMessage(
  tx: Tx,
  scope: { tenantId: string; channelId: string; event: MessageEvent },
): Promise<void> {
  const { tenantId, channelId, event } = scope;
  const contact = await upsertContact(tx, { tenantId, ref: event.contact, optIn: false });
  const conversation = await tx.conversation.upsert({
    where: { tenantId_channelId_contactId: { tenantId, channelId, contactId: contact.id } },
    create: { tenantId, channelId, contactId: contact.id },
    update: {},
  });
  const { count } = await tx.message.createMany({
    data: {
      tenantId,
      channelId,
      conversationId: conversation.id,
      ...contentColumns(event.content),
      direction: event.fromOwner ? MessageDirection.outbound : MessageDirection.inbound,
      author: event.fromOwner ? MessageAuthor.human : MessageAuthor.patient,
      status: event.fromOwner ? MessageStatus.sent : MessageStatus.received,
      providerMessageId: event.providerMessageId,
      providerTimestamp: event.at,
      imported: true,
      sentFromPhone: event.fromOwner,
      createdAt: event.at, // the original time: thread order, and retention counts from it
    },
    skipDuplicates: true,
  });
  if (count === 0) return;
  const latest = conversation.lastMessageAt;
  if (!latest || latest < event.at)
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: event.at },
    });
}

/** The owner's phone book: name and phone into Clientes. No consent: they have not written to us. */
async function importContact(
  tx: Tx,
  tenantId: string,
  event: Extract<HistoryEvent, { kind: typeof InboundKind.contactSync }>,
): Promise<void> {
  if (event.action === ContactAction.remove) return; // removing from the phone book keeps the client
  await upsertContact(tx, { tenantId, ref: event.contact, optIn: false });
}

async function recordProgress(
  tx: Tx,
  channelId: string,
  event: Exclude<
    HistoryEvent,
    { kind: typeof InboundKind.historyMessage | typeof InboundKind.contactSync }
  >,
): Promise<void> {
  if (event.kind === InboundKind.historyDeclined) {
    await tx.channel.update({
      where: { id: channelId },
      data: { historyImport: HistoryImportState.unavailable },
    });
    return;
  }
  const done = event.progress >= PERCENT_DONE;
  await tx.channel.update({
    where: { id: channelId },
    data: {
      historyProgress: Math.min(event.progress, PERCENT_DONE),
      ...(done ? { historyImport: HistoryImportState.done } : {}),
    },
  });
}
