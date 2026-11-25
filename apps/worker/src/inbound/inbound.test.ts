import { randomUUID } from 'node:crypto';
import { ContentType, InboundKind, parseCloudWebhook, type InboundEvent } from '@app/channels';
import { asBody, textMessage } from '@app/channels/fixtures';
import { createDb, MessageAuthor, MessageDirection, MessageStatus } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { applyInboundEvents } from './apply.ts';
import { resolveContact } from './contacts.ts';
import { processInboundEvent } from './job.ts';
import { findStaleMessages } from './reconcile.ts';

// E-09: RF-23b (contact resolution), A-01 (repeated webhook, one message), status updates.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

async function newChannel() {
  const tenant = await db.client.tenant.create({
    data: { name: 'Teste E-09 (fictício)', slug: `e09-${randomUUID()}` },
  });
  const channel = await db.withTenant(tenant.id, (tx) =>
    tx.channel.create({ data: { tenantId: tenant.id, kind: 'cloud_api' } }),
  );
  return { tenantId: tenant.id, channelId: channel.id };
}

const text = (id: string, contact: object, body = 'oi'): InboundEvent => ({
  kind: InboundKind.message,
  providerMessageId: id,
  contact,
  at: new Date('2027-01-04T12:00:00Z'),
  content: { type: ContentType.text, text: body },
});

describe('contact resolution (RF-23b)', () => {
  it('finds the same contact by BSUID, then completes the missing phone', async () => {
    const { tenantId } = await newChannel();
    await db.withTenant(tenantId, async (tx) => {
      const first = await resolveContact(tx, tenantId, { bsuid: 'BR.A1' });
      const again = await resolveContact(tx, tenantId, {
        bsuid: 'BR.A1',
        phoneE164: '+5541999990001',
        name: 'Joana',
      });
      expect(again.id).toBe(first.id);
      expect(again).toMatchObject({
        phoneE164: '+5541999990001',
        phoneKey: '+554199990001',
        name: 'Joana',
      });
    });
  });

  it('treats the number with and without the ninth digit as one contact, and adds the BSUID', async () => {
    const { tenantId } = await newChannel();
    await db.withTenant(tenantId, async (tx) => {
      const old = await resolveContact(tx, tenantId, { phoneE164: '+554199990001' });
      const now = await resolveContact(tx, tenantId, {
        phoneE164: '+5541999990001',
        bsuid: 'BR.B2',
      });
      expect(now.id).toBe(old.id);
      expect(now.bsuid).toBe('BR.B2');
      expect(await tx.contact.count()).toBe(1);
    });
  });

  it('creates a new contact when neither BSUID nor phone is known', async () => {
    const { tenantId } = await newChannel();
    await db.withTenant(tenantId, async (tx) => {
      const a = await resolveContact(tx, tenantId, { bsuid: 'BR.C3' });
      const b = await resolveContact(tx, tenantId, { bsuid: 'BR.D4' });
      expect(a.id).not.toBe(b.id);
    });
  });
});

describe('applying inbound events', () => {
  it('stores a webhook delivered three times as one message (A-01)', async () => {
    const { tenantId, channelId } = await newChannel();
    const event = text('wamid.DUP', { bsuid: 'BR.E5', phoneE164: '+5541999990002' });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await db.withTenant(tenantId, (tx) =>
        applyInboundEvents(tx, { tenantId, channelId, events: [event] }),
      );
    }
    await db.withTenant(tenantId, async (tx) => {
      expect(await tx.message.count()).toBe(1);
      const conversation = await tx.conversation.findFirstOrThrow();
      expect(conversation).toMatchObject({ unreadCount: 1, lastMessageAt: event.at });
      expect(conversation.windowExpiresAt).toEqual(new Date('2027-01-05T12:00:00Z'));
    });
  });

  it('a first message creates a direct-WhatsApp contact with one opt-in and a first stage entry', async () => {
    const { tenantId, channelId } = await newChannel();
    const event = text('wamid.FIRST', { bsuid: 'BR.F6', phoneE164: '+5541999990003' });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await db.withTenant(tenantId, (tx) =>
        applyInboundEvents(tx, { tenantId, channelId, events: [event] }),
      );
    }
    await db.withTenant(tenantId, async (tx) => {
      expect(await tx.contact.findFirstOrThrow()).toMatchObject({ origin: 'whatsapp_direct' });
      expect(await tx.consentEvent.findMany()).toMatchObject([
        { kind: 'opt_in', category: 'service', source: 'patient_message', actorType: 'contact' },
      ]);
      expect(await tx.contactStageEvent.findMany()).toMatchObject([{ toStage: 'new_contact' }]);
    });
  });

  it('records the owner echo as the professional writing, in the same conversation', async () => {
    const { tenantId, channelId } = await newChannel();
    const contact = { bsuid: 'BR.F6' };
    const echo: InboundEvent = {
      kind: InboundKind.ownerEcho,
      providerMessageId: 'wamid.ECHO',
      contact,
      at: new Date('2027-01-04T12:01:00Z'),
      content: { type: ContentType.text, text: 'te ligo já' },
    };
    await db.withTenant(tenantId, (tx) =>
      applyInboundEvents(tx, { tenantId, channelId, events: [text('wamid.IN', contact), echo] }),
    );
    await db.withTenant(tenantId, async (tx) => {
      const messages = await tx.message.findMany({ orderBy: { providerTimestamp: 'asc' } });
      expect(messages.map((m) => [m.direction, m.author, m.status])).toEqual([
        [MessageDirection.inbound, MessageAuthor.patient, MessageStatus.received],
        [MessageDirection.outbound, MessageAuthor.human, MessageStatus.sent],
      ]);
      expect(await tx.conversation.count()).toBe(1);
    });
  });

  it('moves a status forward only, keeping the error code of a failure', async () => {
    const { tenantId, channelId } = await newChannel();
    await db.withTenant(tenantId, (tx) =>
      applyInboundEvents(tx, {
        tenantId,
        channelId,
        events: [text('wamid.IN2', { bsuid: 'BR.G7' })],
      }),
    );
    const conversation = await db.withTenant(tenantId, (tx) => tx.conversation.findFirstOrThrow());
    const outbound = (id: string) => ({
      tenantId,
      channelId,
      conversationId: conversation.id,
      direction: MessageDirection.outbound,
      author: MessageAuthor.ai,
      type: ContentType.text,
      text: 'ok',
      providerMessageId: id,
      status: MessageStatus.sent,
    });
    await db.withTenant(tenantId, (tx) =>
      tx.message.createMany({ data: [outbound('wamid.OUTA'), outbound('wamid.OUTB')] }),
    );
    const status = (
      id: string,
      value: 'delivered' | 'read' | 'failed',
      code?: string,
    ): InboundEvent => ({
      kind: InboundKind.status,
      providerMessageId: id,
      status: value,
      at: new Date(),
      error: code ? { code } : undefined,
    });
    const events = [
      status('wamid.OUTA', 'read'),
      status('wamid.OUTA', 'delivered'),
      status('wamid.OUTB', 'failed', '131047'),
    ];
    const { alerts } = await db.withTenant(tenantId, (tx) =>
      applyInboundEvents(tx, { tenantId, channelId, events }),
    );
    expect(alerts).toEqual([{ providerMessageId: 'wamid.OUTB', code: '131047' }]); // RF-25
    await db.withTenant(tenantId, async (tx) => {
      const byId = Object.fromEntries(
        (await tx.message.findMany()).map((m) => [m.providerMessageId ?? '', m] as const),
      );
      expect(byId['wamid.OUTA']?.status).toBe(MessageStatus.read);
      expect(byId['wamid.OUTB']).toMatchObject({
        status: MessageStatus.failed,
        errorCode: '131047',
      });
    });
  });
});

describe('inbound.process job', () => {
  it('turns a stored batch into messages once, and marks it processed', async () => {
    const { tenantId, channelId } = await newChannel();
    const [batch] = parseCloudWebhook(asBody(textMessage));
    const stored = await db.withTenant(tenantId, (tx) =>
      tx.inboundEvent.create({
        data: {
          tenantId,
          channelId,
          provider: 'whatsapp_cloud',
          payload: batch?.raw as never,
          payloadHash: randomUUID(),
        },
      }),
    );
    await db.withTenant(tenantId, (tx) => processInboundEvent(tx, { inboundEventId: stored.id }));
    await db.withTenant(tenantId, (tx) => processInboundEvent(tx, { inboundEventId: stored.id }));
    await db.withTenant(tenantId, async (tx) => {
      expect(await tx.message.findMany({ select: { text: true } })).toEqual([
        { text: 'oi, quanto custa a avaliação?' },
      ]);
      expect(
        (await tx.inboundEvent.findUniqueOrThrow({ where: { id: stored.id } })).processedAt,
      ).not.toBeNull();
    });
  });
});

describe('daily reconciliation (RF-26)', () => {
  it('lists outbound messages without a delivery status after an hour', async () => {
    const { tenantId, channelId } = await newChannel();
    await db.withTenant(tenantId, (tx) =>
      applyInboundEvents(tx, {
        tenantId,
        channelId,
        events: [text('wamid.IN3', { bsuid: 'BR.H8' })],
      }),
    );
    const conversation = await db.withTenant(tenantId, (tx) => tx.conversation.findFirstOrThrow());
    const twoHoursAgo = new Date(Date.now() - 7_200_000);
    await db.withTenant(tenantId, (tx) =>
      tx.message.createMany({
        data: ['wamid.OLD', 'wamid.NEW'].map((id, index) => ({
          tenantId,
          channelId,
          conversationId: conversation.id,
          direction: MessageDirection.outbound,
          author: MessageAuthor.ai,
          type: ContentType.text,
          text: 'ok',
          providerMessageId: id,
          status: MessageStatus.sent,
          createdAt: index === 0 ? twoHoursAgo : new Date(),
        })),
      }),
    );
    const stale = (await findStaleMessages(db, new Date())).find(
      (entry) => entry.tenantId === tenantId,
    );
    expect(stale).toEqual({ tenantId, count: 1, oldest: twoHoursAgo });
  });
});
