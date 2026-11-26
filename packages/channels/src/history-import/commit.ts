import { MessageAuthor, MessageDirection, MessageStatus, type Tx } from '@app/db';
import { upsertContact } from '../contacts.ts';
import type { ImportScope } from './staging.ts';

// E-24b, spec 03: the owner's choice. Only the selected people become clients and, if asked, bring
// their staged messages as read-only imported conversations. Everything else staged is deleted.

type ImportContact = Awaited<ReturnType<Tx['importContact']['create']>>;

export interface ImportSelection {
  id: string;
  /** Also bring this person's messages (default off in the panel). */
  messages: boolean;
}

export interface CommitInput extends ImportScope {
  selections: readonly ImportSelection[];
  now: Date;
}

export interface CommitResult {
  clients: number;
  messages: number;
}

/** Deletes everything staged for the channel and closes the import: later history webhooks are ignored. */
export async function discardImport(tx: Tx, scope: ImportScope & { now: Date }): Promise<void> {
  await tx.importContact.deleteMany({ where: { channelId: scope.channelId } }); // messages cascade
  await tx.channel.update({
    where: { id: scope.channelId },
    data: { historyReviewedAt: scope.now },
  });
}

export async function commitImport(tx: Tx, input: CommitInput): Promise<CommitResult> {
  const { tenantId, channelId, selections } = input;
  const wantsMessages = new Map(selections.map((one) => [one.id, one.messages]));
  const staged = await tx.importContact.findMany({
    where: { id: { in: [...wantsMessages.keys()] }, channelId },
  });
  let messages = 0;
  for (const row of staged) {
    const contact = await upsertContact(tx, { tenantId, ref: refOf(row), optIn: false });
    if (wantsMessages.get(row.id))
      messages += await moveMessages(tx, { ...input, row, contactId: contact.id });
  }
  await discardImport(tx, input);
  return { clients: staged.length, messages };
}

const refOf = (row: ImportContact) => ({
  bsuid: row.bsuid ?? undefined,
  phoneE164: row.phoneE164 ?? undefined,
  name: row.name ?? undefined,
});

/** Staged messages into the person's conversation, flagged `imported` (never answered, never read by the assistant). */
async function moveMessages(
  tx: Tx,
  input: ImportScope & { row: ImportContact; contactId: string },
): Promise<number> {
  const { tenantId, channelId, row, contactId } = input;
  const staged = await tx.importMessage.findMany({
    where: { importContactId: row.id },
    orderBy: { at: 'asc' },
  });
  if (staged.length === 0) return 0;
  const conversation = await tx.conversation.upsert({
    where: { tenantId_channelId_contactId: { tenantId, channelId, contactId } },
    create: { tenantId, channelId, contactId },
    update: {},
  });
  const { count } = await tx.message.createMany({
    data: staged.map((one) =>
      messageRow(one, { tenantId, channelId, conversationId: conversation.id }),
    ),
    skipDuplicates: true,
  });
  const latest = staged.at(-1)?.at;
  if (latest && (!conversation.lastMessageAt || conversation.lastMessageAt < latest))
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: latest },
    });
  return count;
}

type StagedRow = Awaited<ReturnType<Tx['importMessage']['create']>>;

function messageRow(
  one: StagedRow,
  target: { tenantId: string; channelId: string; conversationId: string },
) {
  return {
    ...target,
    type: one.type,
    text: one.text,
    ...(one.media === null ? {} : { media: one.media }),
    direction: one.fromOwner ? MessageDirection.outbound : MessageDirection.inbound,
    author: one.fromOwner ? MessageAuthor.human : MessageAuthor.patient,
    status: one.fromOwner ? MessageStatus.sent : MessageStatus.received,
    providerMessageId: one.providerMessageId,
    providerTimestamp: one.at,
    imported: true,
    sentFromPhone: one.fromOwner,
    createdAt: one.at, // the original time: thread order, and retention counts from it
  };
}
