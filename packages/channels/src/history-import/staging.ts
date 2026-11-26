import type { MessageType, Prisma, Tx } from '@app/db';
import { phoneKey } from '../phone.ts';
import type { ContactRef } from '../types.ts';

// E-24b, spec 03: what Meta sends for the coexistence history waits in the staging tables
// (`import_contacts`, `import_messages`) until the owner chooses. Nothing here touches Clientes,
// conversations or messages.

export interface ImportScope {
  tenantId: string;
  channelId: string;
}

export interface StagedMessage {
  providerMessageId: string;
  fromOwner: boolean;
  at: Date;
  type: MessageType;
  text: string | null;
  media?: Prisma.InputJsonValue;
}

/** The key one person is staged under: the phone key, or the BSUID when there is no phone. */
const keyOf = (ref: ContactRef): string | null =>
  (ref.phoneE164 ? phoneKey(ref.phoneE164) : null) ?? ref.bsuid ?? null;

/** Stages (or completes) one person from the phone book or a thread. */
export async function stageContact(tx: Tx, scope: ImportScope & { ref: ContactRef }) {
  const { tenantId, channelId, ref } = scope;
  const key = keyOf(ref);
  if (!key) return null;
  const row = await tx.importContact.upsert({
    where: { tenantId_channelId_key: { tenantId, channelId, key } },
    create: {
      tenantId,
      channelId,
      key,
      bsuid: ref.bsuid ?? null,
      phoneE164: ref.phoneE164 ?? null,
      name: ref.name ?? null,
    },
    update: {},
  });
  if (row.name || !ref.name) return row;
  return tx.importContact.update({ where: { id: row.id }, data: { name: ref.name } });
}

/** Stages one message under its person; the same provider id twice adds nothing. */
export async function stageMessage(
  tx: Tx,
  scope: ImportScope & { ref: ContactRef; message: StagedMessage },
): Promise<void> {
  const { tenantId, message } = scope;
  const contact = await stageContact(tx, scope);
  if (!contact) return;
  const { count } = await tx.importMessage.createMany({
    data: { tenantId, importContactId: contact.id, ...message },
    skipDuplicates: true,
  });
  if (count === 0) return;
  const { firstMessageAt, lastMessageAt } = contact;
  await tx.importContact.update({
    where: { id: contact.id },
    data: {
      messageCount: { increment: 1 },
      ...(!firstMessageAt || message.at < firstMessageAt ? { firstMessageAt: message.at } : {}),
      ...(!lastMessageAt || message.at > lastMessageAt ? { lastMessageAt: message.at } : {}),
    },
  });
}
