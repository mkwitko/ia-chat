import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AppointmentCreator,
  bookAppointment,
  cancelAppointment,
  createDb,
  rescheduleAppointment,
  ScheduledMessageState,
} from '../index.ts';

// RF-46, RF-47: booking schedules the confirmation and the reminders; moving or cancelling
// replaces or cancels the pending ones (A-15).

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

// Fri 2027-01-01 09:00 in Sao Paulo; Mondays 09:00-12:00 are open (hourly slots).
const NOW = new Date('2027-01-01T12:00:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const MONDAY_10 = new Date('2027-01-04T13:00:00Z');
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let tenantId = '';
let serviceId = '';
let contactId = '';

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Lembretes (fictício)', slug: `rem-${randomUUID()}` },
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
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
    return { serviceId: service.id, contactId: contact.id };
  }));
});

const book = (startsAt: Date) =>
  bookAppointment(db, {
    tenantId,
    contactId,
    serviceId,
    startsAt,
    key: randomUUID(),
    createdBy: AppointmentCreator.human,
    now: NOW,
  });

const messages = () =>
  db.withTenant(tenantId, (tx) =>
    tx.scheduledMessage.findMany({ orderBy: { sendAt: 'asc' }, include: { appointment: true } }),
  );

describe('scheduling on booking', () => {
  it('leaves the confirmation now and the reminders 24 h and 2 h before', async () => {
    const booked = await book(MONDAY_9);
    expect(booked.ok).toBe(true);
    const rows = await messages();
    expect(rows.map((row) => [row.kind, row.sequence, row.sendAt.toISOString()])).toEqual([
      ['confirmation', 0, NOW.toISOString()],
      ['reminder', 0, '2027-01-03T12:00:00.000Z'],
      ['reminder', 1, '2027-01-04T10:00:00.000Z'],
    ]);
    expect(rows.every((row) => row.state === ScheduledMessageState.scheduled)).toBe(true);
    expect(rows[1]?.templateName).toBe('lembrete_agendamento');
  });

  it('follows the offsets the tenant configured', async () => {
    await db.client.tenant.update({
      where: { id: tenantId },
      data: { reminderOffsetsMinutes: [60] },
    });
    await book(MONDAY_9);
    expect((await messages()).map((row) => row.kind)).toEqual(['confirmation', 'reminder']);
  });

  it('cancels the pending ones when the appointment is cancelled', async () => {
    const booked = await book(MONDAY_9);
    if (!booked.ok) throw new Error('booking failed');
    await cancelAppointment(db, {
      tenantId,
      contactId,
      appointmentId: booked.value.id,
      now: NOW,
      createdBy: AppointmentCreator.human,
    });
    expect((await messages()).map((row) => row.state)).toEqual(Array(3).fill('cancelled'));
  });

  it('replaces them when the appointment moves', async () => {
    const booked = await book(MONDAY_9);
    if (!booked.ok) throw new Error('booking failed');
    const moved = await rescheduleAppointment(db, {
      tenantId,
      contactId,
      appointmentId: booked.value.id,
      startsAt: MONDAY_10,
      key: randomUUID(),
      createdBy: AppointmentCreator.human,
      now: NOW,
    });
    expect(moved.ok).toBe(true);
    const rows = await messages();
    const live = rows.filter((row) => row.state === ScheduledMessageState.scheduled);
    expect(live).toHaveLength(3);
    expect(live.every((row) => row.appointmentId !== booked.value.id)).toBe(true);
    expect(rows.filter((row) => row.state === ScheduledMessageState.cancelled)).toHaveLength(3);
  });
});
