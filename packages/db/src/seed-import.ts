import { MessageType, type Tx } from './index.ts';

const AT = new Date('2027-01-02T12:00:00Z');

/** One staged contact with one staged message (coexistence history import, E-24b). */
export async function seedImportStaging(
  tx: Tx,
  scope: { tenantId: string; channelId: string },
): Promise<void> {
  const { tenantId, channelId } = scope;
  const contact = await tx.importContact.create({
    data: {
      tenantId,
      channelId,
      key: `staged-${tenantId}`,
      name: 'Contato Fictício',
      messageCount: 1,
      firstMessageAt: AT,
      lastMessageAt: AT,
    },
  });
  await tx.importMessage.create({
    data: {
      tenantId,
      importContactId: contact.id,
      providerMessageId: `wamid.staged.${tenantId}`,
      fromOwner: false,
      type: MessageType.text,
      text: 'Mensagem fictícia',
      at: AT,
    },
  });
}
