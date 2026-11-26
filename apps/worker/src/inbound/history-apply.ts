import {
  ContactAction,
  InboundKind,
  stageContact,
  stageMessage,
  type InboundEvent,
} from '@app/channels';
import { MESSAGE_TEXT_RETENTION_DAYS } from '@app/core';
import { HistoryImportState, type Tx } from '@app/db';
import { contentColumns } from './message-row.ts';

// E-24b, spec 03 "Histórico da coexistência": what the `history` and `smb_app_state_sync` webhooks
// bring goes to a staging area, never to Clientes or conversations. The owner reviews it in the
// panel and only the chosen contacts and messages are imported (commitImport: messages flagged
// `imported`, never answered, never read by the assistant). Nothing is staged unless the owner
// authorized it (`requested`), and nothing after the review is closed (`history_reviewed_at`).

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
    select: { historyImport: true, historyReviewedAt: true },
  });
  if (!AUTHORIZED.has(channel.historyImport) || channel.historyReviewedAt) return;
  const cutoff = Date.now() - MESSAGE_TEXT_RETENTION_DAYS * MS_PER_DAY;
  for (const event of events) {
    if (event.kind === InboundKind.historyMessage) {
      if (event.at.getTime() >= cutoff)
        await stageHistoryMessage(tx, { tenantId, channelId, event });
    } else if (event.kind === InboundKind.contactSync) {
      await stageHistoryContact(tx, { tenantId, channelId, event });
    } else {
      await recordProgress(tx, channelId, event);
    }
  }
}

type MessageEvent = Extract<HistoryEvent, { kind: typeof InboundKind.historyMessage }>;

/** The thread message waits in staging (`import_messages`) until the owner picks whose to bring. */
async function stageHistoryMessage(
  tx: Tx,
  scope: { tenantId: string; channelId: string; event: MessageEvent },
): Promise<void> {
  const { tenantId, channelId, event } = scope;
  await stageMessage(tx, {
    tenantId,
    channelId,
    ref: event.contact,
    message: {
      providerMessageId: event.providerMessageId,
      fromOwner: event.fromOwner,
      at: event.at,
      ...contentColumns(event.content),
    },
  });
}

/** The owner's phone book: staged by name and phone. They become clients only if the owner picks them. */
async function stageHistoryContact(
  tx: Tx,
  scope: { tenantId: string; channelId: string; event: ContactEvent },
): Promise<void> {
  const { tenantId, channelId, event } = scope;
  if (event.action === ContactAction.remove) return; // removing from the phone book changes nothing here
  await stageContact(tx, { tenantId, channelId, ref: event.contact });
}

type ContactEvent = Extract<HistoryEvent, { kind: typeof InboundKind.contactSync }>;

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
