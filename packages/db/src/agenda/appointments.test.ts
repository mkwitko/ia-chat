import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AgendaError,
  bookAppointment,
  cancelAppointment,
  createDb,
  isExclusionViolation,
  listUpcoming,
  rescheduleAppointment,
  type BookRequest,
} from '../index.ts';
import { AppointmentCreator } from '../../generated/prisma/enums.ts';

const db = createDb(process.env.DATABASE_URL ?? '', { max: 8 });
afterAll(() => db.client.$disconnect());

// Fri 2027-01-01 09:00 in Sao Paulo; Mondays 09:00-12:00 are open (hourly slots).
const NOW = new Date('2027-01-01T12:00:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const MONDAY_10 = new Date('2027-01-04T13:00:00Z');
const MONDAY_11 = new Date('2027-01-04T14:00:00Z');
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let tenantId = '';
let serviceId = '';
let contacts: string[] = [];

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Agenda (fictício)', slug: `ag-${randomUUID()}` },
  });
  tenantId = tenant.id;
  ({ serviceId, contacts } = await db.withTenant(tenantId, async (tx) => {
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
    const made = await Promise.all(
      [1, 2, 3].map(() => tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } })),
    );
    return { serviceId: service.id, contacts: made.map((contact) => contact.id) };
  }));
});

const request = (contact: number, startsAt: Date, key: string = randomUUID()): BookRequest => ({
  tenantId,
  contactId: contacts[contact] ?? '',
  serviceId,
  startsAt,
  key,
  createdBy: AppointmentCreator.ai,
  now: NOW,
});

describe('bookAppointment', () => {
  it('two patients book the same slot at once: one gets it, the other slot_taken (A-10)', async () => {
    const results = await Promise.all([
      bookAppointment(db, request(0, MONDAY_9)),
      bookAppointment(db, request(1, MONDAY_9)),
      bookAppointment(db, request(2, MONDAY_9)),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const failures = results.filter((result) => !result.ok);
    expect(failures.map((failure) => failure.error)).toEqual([
      AgendaError.slotTaken,
      AgendaError.slotTaken,
    ]);
    const rows = await db.withTenant(tenantId, (tx) => tx.appointment.count());
    expect(rows).toBe(1);
  });

  it('a cancelled appointment frees the slot', async () => {
    const first = await bookAppointment(db, request(0, MONDAY_9));
    if (!first.ok) throw new Error('setup booking failed');
    const cancel = { tenantId, contactId: contacts[0] ?? '', appointmentId: first.value.id };
    await cancelAppointment(db, { ...cancel, now: NOW });
    expect((await bookAppointment(db, request(1, MONDAY_9))).ok).toBe(true);
  });

  it('is idempotent per key: a retried call returns the first booking', async () => {
    const one = await bookAppointment(db, request(0, MONDAY_9, 'turn-1:agendar'));
    const again = await bookAppointment(db, request(0, MONDAY_9, 'turn-1:agendar'));
    expect(one.ok && again.ok && one.value.id === again.value.id).toBe(true);
    expect(await db.withTenant(tenantId, (tx) => tx.appointment.count())).toBe(1);
  });

  it('refuses a time that availableSlots does not offer', async () => {
    const offGrid = new Date('2027-01-04T12:30:00Z');
    const afterHours = new Date('2027-01-04T20:00:00Z');
    for (const startsAt of [offGrid, afterHours]) {
      const result = await bookAppointment(db, request(0, startsAt));
      expect(result).toEqual({ ok: false, error: AgendaError.slotUnavailable });
    }
  });

  it('refuses a third future appointment for the same patient (RF-45)', async () => {
    await bookAppointment(db, request(0, MONDAY_9));
    await bookAppointment(db, request(0, MONDAY_10));
    const third = await bookAppointment(db, request(0, MONDAY_11));
    expect(third).toEqual({ ok: false, error: AgendaError.limitReached });
  });
});

describe('appointments_no_overlap', () => {
  it('rejects overlapping rows even when the checks are bypassed', async () => {
    const insert = (contact: number, startsAt: Date, endsAt: Date) =>
      db.withTenant(tenantId, async (tx) => {
        const professional = await tx.professional.findFirstOrThrow();
        return tx.appointment.create({
          data: {
            tenantId,
            professionalId: professional.id,
            contactId: contacts[contact] ?? '',
            serviceId,
            startsAt,
            endsAt,
          },
        });
      });
    await insert(0, MONDAY_9, MONDAY_10);
    const clash = await insert(1, new Date('2027-01-04T12:30:00Z'), MONDAY_11).catch(
      (error: unknown) => error,
    );
    expect(isExclusionViolation(clash)).toBe(true);
    await insert(1, MONDAY_10, MONDAY_11); // touching ends do not overlap
  });
});

describe('rescheduleAppointment', () => {
  it('moves the appointment: the old time is freed and the new one taken', async () => {
    const booked = await bookAppointment(db, request(0, MONDAY_9));
    if (!booked.ok) throw new Error('setup booking failed');
    const moved = await rescheduleAppointment(db, {
      ...request(0, MONDAY_10, 'turn-2:remarcar'),
      appointmentId: booked.value.id,
    });
    expect(moved.ok).toBe(true);
    const upcoming = await listUpcoming(db, { tenantId, contactId: contacts[0] ?? '', now: NOW });
    expect(upcoming.map((one) => one.startsAt)).toEqual([MONDAY_10]);
    expect((await bookAppointment(db, request(1, MONDAY_9))).ok).toBe(true);
  });

  it('a failed new time keeps the original appointment (A-14)', async () => {
    const mine = await bookAppointment(db, request(0, MONDAY_9));
    await bookAppointment(db, request(1, MONDAY_10));
    if (!mine.ok) throw new Error('setup booking failed');
    const moved = await rescheduleAppointment(db, {
      ...request(0, MONDAY_10, 'turn-3:remarcar'),
      appointmentId: mine.value.id,
    });
    expect(moved).toEqual({ ok: false, error: AgendaError.slotTaken });
    const upcoming = await listUpcoming(db, { tenantId, contactId: contacts[0] ?? '', now: NOW });
    expect(upcoming.map((one) => [one.id, one.startsAt])).toEqual([[mine.value.id, MONDAY_9]]);
  });

  it("does not touch another patient's appointment", async () => {
    const theirs = await bookAppointment(db, request(1, MONDAY_9));
    if (!theirs.ok) throw new Error('setup booking failed');
    const moved = await rescheduleAppointment(db, {
      ...request(0, MONDAY_10),
      appointmentId: theirs.value.id,
    });
    expect(moved).toEqual({ ok: false, error: AgendaError.appointmentNotFound });
  });
});

describe('cancelAppointment', () => {
  it('respects the minimum notice (RF-44)', async () => {
    const booked = await bookAppointment(db, request(0, MONDAY_9));
    if (!booked.ok) throw new Error('setup booking failed');
    const cancel = { tenantId, contactId: contacts[0] ?? '', appointmentId: booked.value.id };
    const late = await cancelAppointment(db, { ...cancel, now: new Date('2027-01-04T00:00:00Z') });
    expect(late).toEqual({ ok: false, error: AgendaError.tooLateToCancel });
    const early = await cancelAppointment(db, { ...cancel, now: NOW });
    expect(early.ok && early.value.status).toBe('cancelled');
  });
});
