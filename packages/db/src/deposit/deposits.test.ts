import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  DepositOutcome,
  PaymentStatus,
  bookAppointment,
  cancelAppointment,
  claimExpiredDeposits,
  claimUnnotifiedDeposits,
  confirmDeposit,
  createDb,
  rescheduleAppointment,
  type BookRequest,
} from '../index.ts';
import { AppointmentCreator } from '../../generated/prisma/enums.ts';

// H-52: a booking with a deposit holds the slot, sends nothing until the professional confirms,
// and is released at the deadline. Fictitious data.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-01-01T12:00:00Z');
const DEADLINE = new Date('2027-01-01T12:30:00Z');
const LATER = new Date('2027-01-01T12:31:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const MONDAY_10 = new Date('2027-01-04T13:00:00Z');
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let tenantId = '';
let serviceId = '';
let contactId = '';

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Sinal (fictício)', slug: `dep-${randomUUID()}` },
  });
  tenantId = tenant.id;
  ({ serviceId, contactId } = await db.withTenant(tenantId, async (tx) => {
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
      data: {
        tenantId,
        name: 'Sessão',
        durationMinutes: 60,
        priceCents: 18_000,
        depositCents: 5_000,
      },
    });
    const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
    return { serviceId: service.id, contactId: contact.id };
  }));
});

const request = (startsAt: Date): BookRequest => ({
  tenantId,
  contactId,
  serviceId,
  startsAt,
  key: randomUUID(),
  createdBy: AppointmentCreator.ai,
  now: NOW,
  deposit: { amountCents: 5_000, expiresAt: DEADLINE },
});

const read = () =>
  db.withTenant(tenantId, async (tx) => ({
    payments: await tx.payment.findMany({ include: { appointment: true } }),
    messages: await tx.scheduledMessage.count(),
  }));

async function held() {
  const booked = await bookAppointment(db, request(MONDAY_9));
  if (!booked.ok) throw new Error(booked.error);
  const { payments } = await read();
  return { appointmentId: booked.value.id, paymentId: payments[0]?.id ?? '' };
}

describe('deposit hold (H-52)', () => {
  it('holds the slot with a pending payment and schedules no message', async () => {
    await held();
    const { payments, messages } = await read();
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ status: PaymentStatus.pending, amountCents: 5_000 });
    expect(messages).toBe(0);
    const again = await bookAppointment(db, { ...request(MONDAY_9), deposit: undefined });
    expect(again.ok).toBe(false);
  });

  it('the professional confirms: paid, and the confirmation and reminders start', async () => {
    const { paymentId } = await held();
    const req = { tenantId, paymentId, now: NOW };
    expect(await confirmDeposit(db, req)).toBe(DepositOutcome.confirmed);
    expect(await confirmDeposit(db, req)).toBe(DepositOutcome.confirmed);
    const { payments, messages } = await read();
    expect(payments[0]?.status).toBe(PaymentStatus.paid);
    expect(messages).toBeGreaterThan(0);
  });

  it('past the deadline it is claimed once and can no longer be confirmed', async () => {
    const { paymentId, appointmentId } = await held();
    expect(await db.withTenant(tenantId, (tx) => claimExpiredDeposits(tx, NOW))).toEqual([]);
    const claimed = await db.withTenant(tenantId, (tx) => claimExpiredDeposits(tx, LATER));
    expect(claimed).toEqual([{ paymentId, appointmentId, contactId, startsAt: MONDAY_9 }]);
    expect(await db.withTenant(tenantId, (tx) => claimExpiredDeposits(tx, LATER))).toEqual([]);
    expect(await confirmDeposit(db, { tenantId, paymentId, now: LATER })).toBe(
      DepositOutcome.expired,
    );
  });

  it('a cancel drops the deposit; a reschedule carries it to the new slot', async () => {
    const first = await held();
    const moved = await rescheduleAppointment(db, {
      ...request(MONDAY_10),
      appointmentId: first.appointmentId,
      deposit: undefined,
    });
    if (!moved.ok) throw new Error(moved.error);
    const after = await read();
    expect(after.payments[0]?.appointmentId).toBe(moved.value.id);
    expect(after.messages).toBe(0);
    await cancelAppointment(db, { tenantId, contactId, appointmentId: moved.value.id, now: NOW });
    const { payments } = await read();
    expect(payments[0]?.status).toBe(PaymentStatus.expired);
  });

  it('tells the professional about each pending deposit once', async () => {
    const { paymentId } = await held();
    const first = await db.withTenant(tenantId, (tx) => claimUnnotifiedDeposits(tx, NOW));
    expect(first).toEqual([paymentId]);
    expect(await db.withTenant(tenantId, (tx) => claimUnnotifiedDeposits(tx, NOW))).toEqual([]);
  });
});
