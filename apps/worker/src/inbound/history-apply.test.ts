import { randomUUID } from 'node:crypto';
import { ContentType, InboundKind, parseCloudWebhook } from '@app/channels';
import { asBody, textMessage } from '@app/channels/fixtures';
import { contactsSync, historyChunk, historyDeclined } from '@app/channels/fixtures/coexistence';
import { createDb, HistoryImportState } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { applyInboundEvents } from './apply.ts';

// E-24b: the coexistence history waits in staging, and only after the owner authorized it.

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

describe('history import staging', () => {
  it('stages the thread and touches nothing else: no client, conversation or message', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    const result = await apply(scope, historyChunk);
    expect(result.turns).toEqual([]);
    expect(result.usage).toEqual([]);
    await db.withTenant(scope.tenantId, async (tx) => {
      expect(await tx.contact.count()).toBe(0);
      expect(await tx.conversation.count()).toBe(0);
      expect(await tx.message.count()).toBe(0);
      expect(await tx.consentEvent.count()).toBe(0);
      const staged = await tx.importContact.findMany({ orderBy: { lastMessageAt: 'asc' } });
      expect(staged.map((one) => one.messageCount).toSorted((a, b) => a - b)).toEqual([1, 3]);
      const [thread] = staged.filter((one) => one.messageCount === 3);
      expect(thread?.firstMessageAt?.getTime()).toBe(1_798_981_100_000);
      expect(thread?.lastMessageAt?.getTime()).toBe(1_798_981_300_000);
      expect(await tx.importMessage.count()).toBe(4);
    });
  });

  it('stages the media placeholder without a download', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    const result = await apply(scope, historyChunk);
    expect(result.media).toEqual([]);
    await db.withTenant(scope.tenantId, async (tx) => {
      const placeholder = await tx.importMessage.findFirstOrThrow({
        where: { providerMessageId: 'wamid.HIST3' },
      });
      expect(placeholder).toMatchObject({ type: 'unsupported', text: null, fromOwner: true });
    });
  });

  it('is idempotent: the same chunk twice adds nothing', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    await apply(scope, historyChunk);
    await apply(scope, historyChunk);
    await db.withTenant(scope.tenantId, async (tx) => {
      expect(await tx.importMessage.count()).toBe(4);
      const counts = (await tx.importContact.findMany()).map((one) => one.messageCount);
      expect(counts.toSorted((a, b) => a - b)).toEqual([1, 3]);
    });
  });

  it('imports nothing before the owner authorizes it', async () => {
    for (const state of [HistoryImportState.offered, HistoryImportState.declined]) {
      const scope = await newChannel(state);
      await apply(scope, historyChunk);
      await apply(scope, contactsSync);
      await db.withTenant(scope.tenantId, async (tx) => {
        expect(await tx.importMessage.count()).toBe(0);
        expect(await tx.importContact.count()).toBe(0);
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
      expect(await tx.importMessage.count()).toBe(0);
    });
  });

  it('stages nothing once the owner closed the review', async () => {
    const scope = await newChannel(HistoryImportState.done);
    await db.withTenant(scope.tenantId, (tx) =>
      tx.channel.update({
        where: { id: scope.channelId },
        data: { historyReviewedAt: new Date() },
      }),
    );
    await apply(scope, historyChunk);
    await apply(scope, contactsSync);
    await db.withTenant(scope.tenantId, async (tx) => {
      expect(await tx.importContact.count()).toBe(0);
    });
  });

  it('stages the phone book without creating clients; removal changes nothing', async () => {
    const scope = await newChannel(HistoryImportState.requested);
    await apply(scope, contactsSync);
    await db.withTenant(scope.tenantId, async (tx) => {
      expect(await tx.contact.count()).toBe(0);
      const staged = await tx.importContact.findMany();
      expect(staged).toHaveLength(1);
      expect(staged[0]).toMatchObject({
        name: 'Joana Exemplo',
        phoneE164: '+5541999990001',
        messageCount: 0,
      });
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
