import { randomUUID } from 'node:crypto';
import { ContentType, InboundKind, parseCloudWebhook } from '@app/channels';
import { asBody, textMessage } from '@app/channels/fixtures';
import { contactsSync, historyChunk, historyDeclined } from '@app/channels/fixtures/coexistence';
import {
  ConversationControl,
  createDb,
  HistoryImportState,
  MessageAuthor,
  MessageStatus,
} from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { applyInboundEvents } from './apply.ts';

// E-24b: the coexistence history becomes read-only context, and only after the owner authorized it.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

async function newChannel(historyImport: HistoryImportState) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Teste E-24b (fictício)', slug: `e24b-${randomUUID()}` },
  });
  const channel = await db.withTenant(tenant.id, (tx) =>
    tx.channel.create({
      data: { tenantId: tenant.id, kind: 'cloud_api', coexistence: true, historyImport },
    }),
  );
  return { tenantId: tenant.id, channelId: channel.id };
}

const eventsOf = (payload: object) =>
  parseCloudWebhook(asBody(payload)).flatMap((batch) => batch.events);

type Scope = Awaited<ReturnType<typeof newChannel>>;
const apply = (scope: Scope, payload: object) =>
  db.withTenant(scope.tenantId, (tx) =>
    applyInboundEvents(tx, { ...scope, events: eventsOf(payload) }),
  );

describe('history import', () => {
  it('stores the thread as imported context: no turn, no unread, no usage, no control change', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    const result = await apply(scope, historyChunk);
    expect(result.turns).toEqual([]);
    expect(result.usage).toEqual([]);
    await db.withTenant(scope.tenantId, async (tx) => {
      const messages = await tx.message.findMany({ orderBy: { providerTimestamp: 'asc' } });
      expect(messages).toHaveLength(4);
      expect(messages.every((message) => message.imported)).toBe(true);
      expect(messages.map((message) => message.author)).toEqual([
        MessageAuthor.patient,
        MessageAuthor.human,
        MessageAuthor.human,
        MessageAuthor.human,
      ]);
      expect(messages[0]).toMatchObject({ status: MessageStatus.received, sentFromPhone: false });
      expect(messages[1]).toMatchObject({ status: MessageStatus.sent, sentFromPhone: true });
      expect(messages[0]?.createdAt).toEqual(messages[0]?.providerTimestamp);
      const conversations = await tx.conversation.findMany();
      expect(conversations).toHaveLength(2);
      expect(
        conversations.every(
          (one) => one.unreadCount === 0 && one.control === ConversationControl.ai,
        ),
      ).toBe(true);
      expect(conversations.every((one) => one.pendingSince === null && one.turnVersion === 0)).toBe(
        true,
      );
    });
  });

  it('stores the media placeholder without a download and records no consent', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    const result = await apply(scope, historyChunk);
    expect(result.media).toEqual([]);
    await db.withTenant(scope.tenantId, async (tx) => {
      const placeholder = await tx.message.findFirstOrThrow({
        where: { providerMessageId: 'wamid.HIST3' },
      });
      expect(placeholder).toMatchObject({ type: 'unsupported', text: null });
      expect(await tx.consentEvent.count()).toBe(0);
    });
  });

  it('is idempotent: the same chunk twice adds nothing', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    await apply(scope, historyChunk);
    await apply(scope, historyChunk);
    await db.withTenant(scope.tenantId, async (tx) => {
      expect(await tx.message.count()).toBe(4);
    });
  });

  it('imports nothing before the owner authorizes it', async () => {
    for (const state of [HistoryImportState.offered, HistoryImportState.declined]) {
      const scope = await newChannel(state);
      await apply(scope, historyChunk);
      await apply(scope, contactsSync);
      await db.withTenant(scope.tenantId, async (tx) => {
        expect(await tx.message.count()).toBe(0);
        expect(await tx.contact.count()).toBe(0);
      });
    }
  });

  it('drops messages older than the retention period (H-34)', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    const [first] = eventsOf(historyChunk);
    if (first?.kind !== InboundKind.historyMessage) throw new Error('fixture changed');
    const old = { ...first, at: new Date('2020-01-01T00:00:00Z') };
    await db.withTenant(scope.tenantId, (tx) =>
      applyInboundEvents(tx, { ...scope, events: [old] }),
    );
    await db.withTenant(scope.tenantId, async (tx) => {
      expect(await tx.message.count()).toBe(0);
    });
  });

  it('imports the phone book as clients without consent; removal keeps the client', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    await apply(scope, contactsSync);
    await db.withTenant(scope.tenantId, async (tx) => {
      const contacts = await tx.contact.findMany();
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toMatchObject({ name: 'Joana Exemplo', phoneE164: '+5541999990001' });
      expect(await tx.consentEvent.count()).toBe(0);
    });
  });

  it('tracks progress, closes at 100 and flags a refusal made in the phone app', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    await apply(scope, historyChunk);
    const row = () =>
      db.withTenant(scope.tenantId, (tx) =>
        tx.channel.findUniqueOrThrow({ where: { id: scope.channelId } }),
      );
    expect(await row()).toMatchObject({ historyProgress: 55, historyImport: 'requested' });
    await db.withTenant(scope.tenantId, (tx) =>
      applyInboundEvents(tx, {
        ...scope,
        events: [{ kind: InboundKind.historyProgress, progress: 100, at: new Date() }],
      }),
    );
    expect(await row()).toMatchObject({ historyProgress: 100, historyImport: 'done' });
    const refused = await newChannel(HistoryImportState.requested);
    await apply(refused, historyDeclined);
    const refusedRow = await db.withTenant(refused.tenantId, (tx) =>
      tx.channel.findUniqueOrThrow({ where: { id: refused.channelId } }),
    );
    expect(refusedRow.historyImport).toBe('unavailable');
  });

  it('keeps a live patient message after the import answerable: only it opens a turn', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    await apply(scope, historyChunk);
    const result = await apply(scope, textMessage);
    expect(result.turns).toHaveLength(1);
    await db.withTenant(scope.tenantId, async (tx) => {
      const live = await tx.message.findMany({ where: { imported: false } });
      expect(live).toHaveLength(1);
      expect(live[0]?.type).toBe(ContentType.text);
    });
  });
});
