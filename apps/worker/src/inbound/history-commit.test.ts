import { randomUUID } from 'node:crypto';
import { commitImport, discardImport, parseCloudWebhook } from '@app/channels';
import { asBody } from '@app/channels/fixtures';
import { contactsSync, historyChunk } from '@app/channels/fixtures/coexistence';
import {
  ConversationControl,
  createDb,
  HistoryImportState,
  MessageAuthor,
  MessageStatus,
} from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { applyInboundEvents } from './apply.ts';

// E-24b: the owner's review. Only the chosen contacts become clients and only the chosen messages
// come over; everything else staged is deleted.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const THREAD_PHONE = '+5541999990001';
const OTHER_PHONE = '+5541999990002';
const THREAD_MESSAGES = 3;

async function stagedChannel() {
  const tenant = await db.client.tenant.create({
    data: { name: 'Teste revisão (fictício)', slug: `rev-${randomUUID()}` },
  });
  const channel = await db.withTenant(tenant.id, (tx) =>
    tx.channel.create({
      data: {
        tenantId: tenant.id,
        kind: 'cloud_api',
        coexistence: true,
        historyImport: HistoryImportState.done,
      },
    }),
  );
  const scope = { tenantId: tenant.id, channelId: channel.id };
  for (const payload of [historyChunk, contactsSync]) {
    const events = parseCloudWebhook(asBody(payload)).flatMap((batch) => batch.events);
    await db.withTenant(scope.tenantId, (tx) => applyInboundEvents(tx, { ...scope, events }));
  }
  return scope;
}

const stagedIdOf = (scope: { tenantId: string }, phone: string) =>
  db.withTenant(scope.tenantId, async (tx) => {
    const rows = await tx.importContact.findMany();
    const row = rows.find((one) => one.phoneE164 === phone);
    if (!row) throw new Error(`fixture changed: no ${phone}`);
    return row.id;
  });

describe('history import review', () => {
  it('imports only the selected contacts, without messages unless chosen, and purges the rest', async () => {
    const scope = await stagedChannel();
    const id = await stagedIdOf(scope, THREAD_PHONE);
    const result = await db.withTenant(scope.tenantId, (tx) =>
      commitImport(tx, { ...scope, selections: [{ id, messages: false }], now: new Date() }),
    );
    expect(result).toEqual({ clients: 1, messages: 0 });
    await db.withTenant(scope.tenantId, async (tx) => {
      const clients = await tx.contact.findMany();
      expect(clients.map((one) => one.phoneE164)).toEqual([THREAD_PHONE]);
      expect(await tx.message.count()).toBe(0);
      expect(await tx.conversation.count()).toBe(0);
      expect(await tx.consentEvent.count()).toBe(0);
      expect(await tx.importContact.count()).toBe(0);
      expect(await tx.importMessage.count()).toBe(0);
      const channel = await tx.channel.findUniqueOrThrow({ where: { id: scope.channelId } });
      expect(channel.historyReviewedAt).not.toBeNull();
    });
  });

  it('brings only the chosen contact messages, read-only and flagged as imported', async () => {
    const scope = await stagedChannel();
    const id = await stagedIdOf(scope, THREAD_PHONE);
    const other = await stagedIdOf(scope, OTHER_PHONE);
    const result = await db.withTenant(scope.tenantId, (tx) =>
      commitImport(tx, {
        ...scope,
        selections: [
          { id, messages: true },
          { id: other, messages: false },
        ],
        now: new Date(),
      }),
    );
    expect(result).toEqual({ clients: 2, messages: THREAD_MESSAGES });
    await db.withTenant(scope.tenantId, async (tx) => {
      const messages = await tx.message.findMany({ orderBy: { providerTimestamp: 'asc' } });
      expect(messages).toHaveLength(THREAD_MESSAGES);
      expect(messages.every((message) => message.imported)).toBe(true);
      expect(messages.map((message) => message.author)).toEqual([
        MessageAuthor.patient,
        MessageAuthor.human,
        MessageAuthor.human,
      ]);
      expect(messages[1]).toMatchObject({ status: MessageStatus.sent, sentFromPhone: true });
      expect(messages[0]?.createdAt).toEqual(messages[0]?.providerTimestamp);
      const conversations = await tx.conversation.findMany();
      expect(conversations).toHaveLength(1);
      expect(conversations[0]).toMatchObject({
        unreadCount: 0,
        control: ConversationControl.ai,
        pendingSince: null,
        turnVersion: 0,
      });
      expect(await tx.consentEvent.count()).toBe(0);
    });
  });

  it('ignores ids that belong to another tenant', async () => {
    const mine = await stagedChannel();
    const theirs = await stagedChannel();
    const foreign = await stagedIdOf(theirs, THREAD_PHONE);
    const result = await db.withTenant(mine.tenantId, (tx) =>
      commitImport(tx, { ...mine, selections: [{ id: foreign, messages: true }], now: new Date() }),
    );
    expect(result).toEqual({ clients: 0, messages: 0 });
    await db.withTenant(theirs.tenantId, async (tx) => {
      expect(await tx.importContact.count()).toBeGreaterThan(0);
    });
  });

  it('discards everything staged and closes the import', async () => {
    const scope = await stagedChannel();
    await db.withTenant(scope.tenantId, (tx) => discardImport(tx, { ...scope, now: new Date() }));
    await db.withTenant(scope.tenantId, async (tx) => {
      expect(await tx.importContact.count()).toBe(0);
      expect(await tx.importMessage.count()).toBe(0);
      expect(await tx.contact.count()).toBe(0);
    });
  });
});
