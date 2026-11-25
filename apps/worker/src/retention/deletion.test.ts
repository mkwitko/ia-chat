import { randomUUID } from 'node:crypto';
import { DATA_RETENTION_DAYS } from '@app/core';
import {
  ChannelKind,
  ConversationControl,
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  MessageType,
  TenantStatus,
  createDb,
} from '@app/db';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { sweepTenantDeletion } from './sweep.ts';

// E-26 (RF-63, LGPD): a closed account keeps its data 30 days, then the daily job erases it.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const DAY = 86_400_000;
const CLOSED = new Date('2027-03-01T12:00:00Z');
const after = (days: number) => new Date(CLOSED.getTime() + days * DAY);
const SECRET_TEXT = 'texto de mensagem fictício';

async function seedTenant(data: { status: TenantStatus; trialEndedAt?: Date; cancelledAt?: Date }) {
  const tenant = await db.client.tenant.create({
    data: {
      name: 'Consultório fictício',
      slug: `del-${randomUUID()}`,
      document: randomUUID().replaceAll('-', '').slice(0, 14),
      status: data.status,
      ...(data.trialEndedAt ? { trialEndedAt: data.trialEndedAt } : {}),
    },
  });
  // The trigger stamps cancelled_at with now(); tests need a fixed clock.
  if (data.cancelledAt) {
    await db.client.tenant.update({
      where: { id: tenant.id },
      data: { cancelledAt: data.cancelledAt },
    });
  }
  const user = await db.client.user.create({
    data: { name: 'Dono', email: `dono-${randomUUID()}@exemplo.test`, emailVerified: true },
  });
  await db.withTenant(tenant.id, async (tx) => {
    const t = tenant.id;
    await tx.membership.create({ data: { tenantId: t, userId: user.id, role: 'owner' } });
    const channel = await tx.channel.create({
      data: { tenantId: t, kind: ChannelKind.cloud_api, accessTokenEnc: 'segredo-cifrado' },
    });
    const contact = await tx.contact.create({
      data: {
        tenantId: t,
        name: 'Paciente fictício',
        phoneE164: '+5511999990000',
        phoneKey: '551199990000',
      },
    });
    const conversation = await tx.conversation.create({
      data: {
        tenantId: t,
        channelId: channel.id,
        contactId: contact.id,
        control: ConversationControl.ai,
      },
    });
    await tx.message.create({
      data: {
        tenantId: t,
        conversationId: conversation.id,
        channelId: channel.id,
        direction: MessageDirection.inbound,
        author: MessageAuthor.patient,
        type: MessageType.text,
        text: SECRET_TEXT,
        status: MessageStatus.received,
      },
    });
    const professional = await tx.professional.create({ data: { tenantId: t, name: 'Prof' } });
    const service = await tx.service.create({
      data: { tenantId: t, name: 'Sessão', durationMinutes: 30, priceCents: 10_000 },
    });
    await tx.appointment.create({
      data: {
        tenantId: t,
        professionalId: professional.id,
        contactId: contact.id,
        serviceId: service.id,
        startsAt: after(40),
        endsAt: new Date(after(40).getTime() + 30 * 60_000),
      },
    });
    await tx.knowledgeItem.create({ data: { tenantId: t, question: 'Onde fica?' } });
    await tx.auditLog.create({
      data: { tenantId: t, actorType: 'system', action: 'created', entity: 'contact' },
    });
  });
  return { tenantId: tenant.id, userId: user.id };
}

const counts = (tenantId: string) =>
  db.withTenant(tenantId, async (tx) => ({
    contacts: await tx.contact.count(),
    messages: await tx.message.count(),
    conversations: await tx.conversation.count(),
    appointments: await tx.appointment.count(),
    channels: await tx.channel.count(),
    knowledge: await tx.knowledgeItem.count(),
    memberships: await tx.membership.count({ where: { tenantId } }),
    audit: await tx.auditLog.count(),
  }));

const sweep = (now: Date, onlyTenantId: string, alert = vi.fn()) =>
  sweepTenantDeletion({ db, now, alert, onlyTenantId });

describe('deletion of closed accounts', () => {
  it('keeps the data until 30 days after the cancellation, then erases it', async () => {
    const { tenantId } = await seedTenant({ status: TenantStatus.cancelled, cancelledAt: CLOSED });

    expect(await sweep(after(DATA_RETENTION_DAYS - 1), tenantId)).toEqual({ erased: 0 });
    expect((await counts(tenantId)).messages).toBe(1);

    expect(await sweep(after(DATA_RETENTION_DAYS), tenantId)).toEqual({ erased: 1 });
    expect(await counts(tenantId)).toEqual({
      contacts: 0,
      messages: 0,
      conversations: 0,
      appointments: 0,
      channels: 0,
      knowledge: 0,
      memberships: 0,
      audit: 1,
    });
  });

  it('anonymizes the tenant row, drops the owner account and stamps the deletion', async () => {
    const { tenantId, userId } = await seedTenant({
      status: TenantStatus.cancelled,
      cancelledAt: CLOSED,
    });
    await sweep(after(DATA_RETENTION_DAYS), tenantId);

    const row = await db.client.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    expect(row.dataDeletedAt).toEqual(after(DATA_RETENTION_DAYS));
    expect(row.document).toBeNull();
    expect(row.name).not.toContain('fictício');
    expect(row.status).toBe(TenantStatus.cancelled);
    expect(await db.client.user.findUnique({ where: { id: userId } })).toBeNull();
  });

  it('keeps a user who belongs to another tenant', async () => {
    const closing = await seedTenant({ status: TenantStatus.cancelled, cancelledAt: CLOSED });
    const other = await seedTenant({ status: TenantStatus.active });
    await db.withTenant(other.tenantId, (tx) =>
      tx.membership.create({
        data: { tenantId: other.tenantId, userId: closing.userId, role: 'professional' },
      }),
    );
    await sweep(after(DATA_RETENTION_DAYS), closing.tenantId);

    expect(await db.client.user.findUnique({ where: { id: closing.userId } })).not.toBeNull();
    expect((await counts(other.tenantId)).messages).toBe(1);
  });

  it('never touches another tenant, an active one, or a cancellation not yet 30 days old', async () => {
    const due = await seedTenant({ status: TenantStatus.cancelled, cancelledAt: CLOSED });
    const recent = await seedTenant({ status: TenantStatus.cancelled, cancelledAt: after(10) });
    const active = await seedTenant({ status: TenantStatus.active });
    const now = after(DATA_RETENTION_DAYS + 5);
    await sweep(now, due.tenantId);
    await sweep(now, recent.tenantId);
    await sweep(now, active.tenantId);

    expect((await counts(due.tenantId)).messages).toBe(0);
    expect((await counts(recent.tenantId)).messages).toBe(1);
    expect((await counts(active.tenantId)).messages).toBe(1);
  });

  it('also erases a trial that ended without subscribing, 30 days later (RF-88)', async () => {
    const { tenantId } = await seedTenant({
      status: TenantStatus.restricted,
      trialEndedAt: CLOSED,
    });
    expect(await sweep(after(DATA_RETENTION_DAYS - 1), tenantId)).toEqual({ erased: 0 });
    expect(await sweep(after(DATA_RETENTION_DAYS), tenantId)).toEqual({ erased: 1 });
    expect((await counts(tenantId)).contacts).toBe(0);
  });

  it('runs once: the second pass finds nothing to do', async () => {
    const { tenantId } = await seedTenant({ status: TenantStatus.cancelled, cancelledAt: CLOSED });
    const now = after(DATA_RETENTION_DAYS);
    expect(await sweep(now, tenantId)).toEqual({ erased: 1 });
    expect(await sweep(now, tenantId)).toEqual({ erased: 0 });
  });

  it('alerts with ids only when one tenant fails, never with message content', async () => {
    const { tenantId } = await seedTenant({ status: TenantStatus.cancelled, cancelledAt: CLOSED });
    const alert = vi.fn();
    const broken = {
      ...db,
      withTenant: () => Promise.reject(new Error(SECRET_TEXT)),
    };
    await sweepTenantDeletion({
      db: broken,
      now: after(DATA_RETENTION_DAYS),
      alert,
      onlyTenantId: tenantId,
    });

    expect(alert).toHaveBeenCalledTimes(1);
    const context: unknown = alert.mock.calls[0]?.[1];
    expect(context).toEqual({ tenantId, code: 'tenant_deletion' });
    expect(await counts(tenantId)).toMatchObject({ messages: 1 });
  });
});
