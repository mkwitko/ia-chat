import { commitImport, discardImport, type ImportSelection } from '@app/channels';
import { HistoryImportState, MessageType, type Tx } from '@app/db';

// E-24b, spec 03 "Revisar importação": reads and writes of the staging area. The list never carries
// message text; the preview shows a few messages of one contact, to the owner only.

export const PREVIEW_LIMIT = 5;
/** Pilot scale: one number's phone book. The review lists everything so "select all" is exact. */
const MAX_CONTACTS = 5000;
const MEDIA_PLACEHOLDER = null;

/** The coexistence channel the import belongs to, with its state. */
export function reviewChannel(tx: Tx) {
  return tx.channel.findFirst({
    where: { coexistence: true, historyImport: { not: HistoryImportState.none } },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, historyImport: true },
  });
}

export async function listStaged(tx: Tx, channelId: string) {
  const rows = await tx.importContact.findMany({
    where: { channelId },
    orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
    take: MAX_CONTACTS,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phoneE164,
    messageCount: row.messageCount,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
  }));
}

/** The last messages of one contact, oldest first; media shows as a placeholder (text is null). */
export async function previewStaged(tx: Tx, contactId: string) {
  const rows = await tx.importMessage.findMany({
    where: { importContactId: contactId },
    orderBy: { at: 'desc' },
    take: PREVIEW_LIMIT,
  });
  return rows.toReversed().map((row) => ({
    id: row.id,
    fromOwner: row.fromOwner,
    text: row.type === MessageType.text ? row.text : MEDIA_PLACEHOLDER,
    at: row.at.toISOString(),
  }));
}

export const confirmStaged = (
  tx: Tx,
  scope: { tenantId: string; channelId: string; selections: readonly ImportSelection[] },
) => commitImport(tx, { ...scope, now: new Date() });

export const discardStaged = (tx: Tx, scope: { tenantId: string; channelId: string }) =>
  discardImport(tx, { ...scope, now: new Date() });
