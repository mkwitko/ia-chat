import { randomUUID } from 'node:crypto';
import {
  AppointmentCreator,
  AppointmentStatus,
  PaymentStatus,
  bookAppointment,
  createDb,
} from '@app/db';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotifyReason } from '../notify/reasons.ts';
import { sweepDeposits } from './deposit-sweep.ts';

// H-52 with the database and a fake channel: the professional hears once; at the deadline the
// slot is released and the patient told inside the window. Fictitious data.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-01-01T12:00:00Z');
const DEADLINE = new Date('2027-01-01T12:30:00Z');
const LATER = new Date('2027-01-01T12:31:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const OPEN_UNTIL = new Date('2027-01-02T12:00:00Z');
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let tenantId = '';
let appointmentId = '';
let sent: string[] = [];
const notify = vi.fn(() => Promise.resolve());
const channel = {
  send: (_tx: unknown, { text }: { conversationId: string; text: string }) => {
    sent.push(text);
    return Promise.resolve({ providerMessageId: `fake.${randomUUID()}` });
  },
};
const sweep = (now: Date) =>
  sweepDeposits({ db, channel, notify, alert: vi.fn(), now, onlyTenantId: tenantId });

beforeEach(async () => {
  sent = [];
  notify.mockClear();
  const tenant = await db.client.tenant.create({
    data: { name: 'Sinal (fictício)', slug: `dep-${randomUUID()}` },
  });
  tenantId = tenant.id;
  const ids = await db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    await tx.availabilityRule.create({
      data: {
        tenantId,
        professionalId: professional.id,
        weekday: 1,
        startTime: at('09:00'),
        endTime: at('12:00'),
      },
    });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const channelRow = await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } });
    const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
    await tx.conversation.create({
      data: {
        tenantId,
        channelId: channelRow.id,
        contactId: contact.id,
        windowExpiresAt: OPEN_UNTIL,
      },
    });
    return { serviceId: service.id, contactId: contact.id };
  });
  const booked = await bookAppointment(db, {
    tenantId,
    ...ids,
    startsAt: MONDAY_9,
    key: randomUUID(),
    createdBy: AppointmentCreator.ai,
    now: NOW,
    deposit: { amountCents: 5_000, expiresAt: DEADLINE },
  });
  if (!booked.ok) throw new Error(booked.error);
  appointmentId = booked.value.id;
});

const state = () =>
  db.withTenant(tenantId, async (tx) => ({
    appointment: await tx.appointment.findUniqueOrThrow({ where: { id: appointmentId } }),
    payment: await tx.payment.findFirstOrThrow(),
  }));

describe('deposit sweep (H-52)', () => {
  it('tells the professional once, without content, and keeps the slot before the deadline', async () => {
    expect(await sweep(NOW)).toBe(0);
    await sweep(NOW);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, reason: NotifyReason.depositPending }),
    );
    expect((await state()).appointment.status).not.toBe(AppointmentStatus.cancelled);
  });

  it('releases the slot at the deadline and tells the patient inside the window', async () => {
    expect(await sweep(LATER)).toBe(1);
    const { appointment, payment } = await state();
    expect(appointment.status).toBe(AppointmentStatus.cancelled);
    expect(payment.status).toBe(PaymentStatus.expired);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('foi liberado porque o sinal não foi confirmado');
    expect(await sweep(LATER)).toBe(0);
    expect(sent).toHaveLength(1);
  });
});
