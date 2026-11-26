import { randomUUID } from 'node:crypto';
import { MESSAGE_TEXT_RETENTION_DAYS } from '@app/core';
import {
  ChannelKind,
  createDb,
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@app/db';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { sweepMessageRetention } from './messages.ts';

// H-34: message text and media references are kept at most 90 days after the conversation's last
// message. Metadata (author, type, time, status) stays.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const DAY = 86_400_000;
const NOW = new Date('2027-06-01T12:00:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const SECRET = 'texto de mensagem fictício';
const KEY = (tenantId: string, messageId: string) => `tenants/${tenantId}/media/${messageId}.ogg`;

const alert = vi.fn();
const okStore = () => ({ delete: vi.fn(() => Promise.resolve()) });

/** One conversation whose last message is `idleDays` old: a text message and a stored audio. */
async function seed(idleDays: number) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Teste retenção (fictício)', slug: `ret-${randomUUID()}` },
  });
  const tenantId = tenant.id;
  const messageIds = await db.withTenant(tenantId, async (tx) => {
    const channel = await tx.channel.create({ data: { tenantId, kind: ChannelKind.cloud_api } });
    const contact = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${tenantId}`, name: 'Pessoa Fictícia' },
    });
    const conversation = await tx.conversation.create({
      data: {
        tenantId,
        channelId: channel.id,
        contactId: contact.id,
        lastMessageAt: ago(idleDays),
        summary: 'resumo fictício',
      },
    });
    const base = {
      tenantId,
      channelId: channel.id,
      conversationId: conversation.id,
      direction: MessageDirection.inbound,
      author: MessageAuthor.patient,
      status: MessageStatus.received,
    };
    const text = await tx.message.create({
      data: { ...base, type: MessageType.text, text: SECRET, createdAt: ago(idleDays + 5) },
    });
    const audio = await tx.message.create({
      data: { ...base, type: MessageType.audio, text: SECRET, createdAt: ago(idleDays) },
    });
    await tx.message.update({
      where: { id: audio.id },
      data: {
        media: { mediaId: 'm', mime: 'audio/ogg', state: 'stored', key: KEY(tenantId, audio.id) },
      },
    });
    return { text: text.id, audio: audio.id };
  });
  return { tenantId, ...messageIds };
}

const rows = (tenantId: string) =>
  db.withTenant(tenantId, (tx) => tx.message.findMany({ orderBy: { createdAt: 'asc' } }));

describe('message text retention (H-34)', () => {
  it('erases text and media of a conversation idle past the period, keeping metadata and the R2 object gone', async () => {
    const a = await seed(MESSAGE_TEXT_RETENTION_DAYS + 1);
    const store = okStore();
    const result = await sweepMessageRetention({
      db,
      now: NOW,
      store,
      alert,
      onlyTenantIds: [a.tenantId],
    });
    expect(result).toEqual({ messages: 2, media: 1, summaries: 1 });
    expect(store.delete).toHaveBeenCalledExactlyOnceWith(KEY(a.tenantId, a.audio));
    const [text, audio] = await rows(a.tenantId);
    for (const row of [text, audio]) {
      expect(row).toMatchObject({ text: null, media: null, redactedAt: NOW });
      expect(row?.author).toBe(MessageAuthor.patient);
      expect(row?.status).toBe(MessageStatus.received);
    }
    expect(audio?.type).toBe(MessageType.audio);
    const conversation = await db.withTenant(a.tenantId, (tx) =>
      tx.conversation.findFirstOrThrow(),
    );
    expect(conversation.summary).toBeNull();
  });

  it('keeps a conversation whose last message is inside the period, even its old messages', async () => {
    const a = await seed(MESSAGE_TEXT_RETENTION_DAYS - 1);
    const store = okStore();
    const result = await sweepMessageRetention({
      db,
      now: NOW,
      store,
      alert,
      onlyTenantIds: [a.tenantId],
    });
    expect(result).toEqual({ messages: 0, media: 0, summaries: 0 });
    expect(store.delete).not.toHaveBeenCalled();
    expect((await rows(a.tenantId)).map((row) => row.text)).toEqual([SECRET, SECRET]);
  });

  it('is idempotent: a second run touches nothing and deletes nothing again', async () => {
    const a = await seed(MESSAGE_TEXT_RETENTION_DAYS + 10);
    const store = okStore();
    const run = () =>
      sweepMessageRetention({ db, now: NOW, store, alert, onlyTenantIds: [a.tenantId] });
    await run();
    const again = await run();
    expect(again).toEqual({ messages: 0, media: 0, summaries: 0 });
    expect(store.delete).toHaveBeenCalledOnce();
  });

  it('works in batches until nothing is left', async () => {
    const a = await seed(MESSAGE_TEXT_RETENTION_DAYS + 2);
    const result = await sweepMessageRetention({
      db,
      now: NOW,
      store: okStore(),
      alert,
      batchSize: 1,
      onlyTenantIds: [a.tenantId],
    });
    expect(result.messages).toBe(2);
    expect((await rows(a.tenantId)).every((row) => row.redactedAt !== null)).toBe(true);
  });

  it('only touches the tenants it is run for (RLS scopes every batch)', async () => {
    const a = await seed(MESSAGE_TEXT_RETENTION_DAYS + 3);
    const b = await seed(MESSAGE_TEXT_RETENTION_DAYS + 3);
    await sweepMessageRetention({
      db,
      now: NOW,
      store: okStore(),
      alert,
      onlyTenantIds: [a.tenantId],
    });
    expect((await rows(b.tenantId)).map((row) => row.text)).toEqual([SECRET, SECRET]);
  });

  it('keeps the data when R2 refuses the delete, alerts with ids only, and finishes next time', async () => {
    const a = await seed(MESSAGE_TEXT_RETENTION_DAYS + 4);
    const failing = { delete: vi.fn(() => Promise.reject(new Error(SECRET))) };
    alert.mockClear();
    await sweepMessageRetention({
      db,
      now: NOW,
      store: failing,
      alert,
      onlyTenantIds: [a.tenantId],
    });
    expect((await rows(a.tenantId)).map((row) => row.text)).toEqual([SECRET, SECRET]);
    expect(alert).toHaveBeenCalledOnce();
    expect(JSON.stringify(alert.mock.calls)).not.toContain(SECRET);
    const result = await sweepMessageRetention({
      db,
      now: NOW,
      store: okStore(),
      alert,
      onlyTenantIds: [a.tenantId],
    });
    expect(result.messages).toBe(2);
  });
});
