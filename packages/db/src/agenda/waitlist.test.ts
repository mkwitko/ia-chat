import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AgendaError,
  bookAppointment,
  cancelAppointment,
  claimSlotOffer,
  createDb,
  expireWaitlist,
  freedSlots,
  joinWaitlist,
  OFFER_TTL_MINUTES,
  rescheduleAppointment,
  type BookRequest,
} from '../index.ts';
import {
  AppointmentCreator,
  SlotOfferState,
  WaitlistStatus,
} from '../../generated/prisma/enums.ts';

// M-09: a cancelled slot goes to the first matching waitlist entry, one open offer at a time;
// it expires after OFFER_TTL_MINUTES and the next entry gets it. The booking constraint decides.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 8 });
afterAll(() => db.client.$disconnect());

// Fri 2027-01-01 09:00 in Sao Paulo; Mondays 09:00-12:00 are open (hourly slots).
const NOW = new Date('2027-01-01T12:00:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const MONDAY_10 = new Date('2027-01-04T13:00:00Z');
const WEEK_START = new Date('2027-01-03T03:00:00Z');
const WEEK_END = new Date('2027-01-10T03:00:00Z');
const LATER = new Date('2027-01-20T03:00:00Z');
const AFTER_TTL = new Date(NOW.getTime() + (OFFER_TTL_MINUTES + 1) * 60_000);
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let tenantId = '';
let serviceId = '';
let contacts: string[] = [];

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Lista de espera (fictício)', slug: `wl-${randomUUID()}` },
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
      [1, 2, 3, 4].map(() =>
        tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } }),
      ),
    );
    return { serviceId: service.id, contacts: made.map((contact) => contact.id) };
  }));
});

const contact = (index: number) => contacts[index] ?? '';
const booking = (index: number, startsAt: Date, now = NOW): BookRequest => ({
  tenantId,
  contactId: contact(index),
  serviceId,
  startsAt,
  key: randomUUID(),
  createdBy: AppointmentCreator.ai,
  now,
});
const join = (index: number, windowEnd = WEEK_END) =>
  joinWaitlist(db, {
    tenantId,
    contactId: contact(index),
    serviceId,
    windowStart: WEEK_START,
    windowEnd,
  });
const inTenant = <T>(work: Parameters<typeof db.withTenant<T>>[1]) => db.withTenant(tenantId, work);

/** Contact 0 books Monday 9:00 and cancels it: the slot is freed. */
async function freeMonday9() {
  const booked = await bookAppointment(db, booking(0, MONDAY_9));
  if (!booked.ok) throw new Error(booked.error);
  await cancelAppointment(db, {
    tenantId,
    contactId: contact(0),
    appointmentId: booked.value.id,
    now: NOW,
  });
}

describe('joinWaitlist', () => {
  it('keeps one waiting entry per client and service: a second request moves the window', async () => {
    await join(1);
    await join(1, LATER);
    const entries = await inTenant((tx) => tx.slotWaitlistEntry.findMany());
    expect(entries).toHaveLength(1);
    expect(entries[0]?.windowEnd).toEqual(LATER);
  });
});

describe('slot offers', () => {
  it('a cancellation frees the slot and the first matching entry is offered it', async () => {
    await join(1);
    await join(2);
    await freeMonday9();
    expect(await inTenant((tx) => freedSlots(tx, NOW))).toEqual([MONDAY_9]);
    const offer = await inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: NOW }));
    expect(offer?.contactId).toBe(contact(1));
    expect(offer?.expiresAt).toEqual(new Date(NOW.getTime() + OFFER_TTL_MINUTES * 60_000));
  });

  it('while an offer is open the slot is not offered to anyone else', async () => {
    await join(1);
    await join(2);
    await freeMonday9();
    await inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: NOW }));
    expect(await inTenant((tx) => freedSlots(tx, NOW))).toEqual([]);
    await expect(
      inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: NOW })),
    ).rejects.toThrow();
  });

  it('after the offer expires the next entry gets it, never the same one twice', async () => {
    await join(1);
    await join(2);
    await freeMonday9();
    await inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: NOW }));
    await inTenant((tx) => expireWaitlist(tx, AFTER_TTL));
    const states = await inTenant((tx) => tx.slotOffer.findMany({ select: { state: true } }));
    expect(states).toEqual([{ state: SlotOfferState.expired }]);
    const next = await inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: AFTER_TTL }));
    expect(next?.contactId).toBe(contact(2));
    await inTenant((tx) => expireWaitlist(tx, new Date(AFTER_TTL.getTime() + 3_600_000)));
    const none = await inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: LATER }));
    expect(none).toBeNull();
  });

  it('skips an entry whose window does not cover the slot, and a slot already taken again', async () => {
    await joinWaitlist(db, {
      tenantId,
      contactId: contact(1),
      serviceId,
      windowStart: WEEK_END,
      windowEnd: LATER,
    });
    await join(2);
    await freeMonday9();
    const offer = await inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: NOW }));
    expect(offer?.contactId).toBe(contact(2));
    await inTenant((tx) => expireWaitlist(tx, AFTER_TTL));
    await bookAppointment(db, booking(3, MONDAY_9));
    expect(await inTenant((tx) => freedSlots(tx, AFTER_TTL))).toEqual([]);
  });

  it('the offered client booking the slot settles the offer and the entry', async () => {
    await join(1);
    await freeMonday9();
    await inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: NOW }));
    expect((await bookAppointment(db, booking(1, MONDAY_9))).ok).toBe(true);
    const offer = await inTenant((tx) => tx.slotOffer.findFirstOrThrow());
    const entry = await inTenant((tx) => tx.slotWaitlistEntry.findFirstOrThrow());
    expect(offer.state).toBe(SlotOfferState.accepted);
    expect(entry.status).toBe(WaitlistStatus.booked);
  });

  it('two offered clients confirm at once: one gets the slot, the other slot_taken', async () => {
    await join(1);
    await join(2);
    await freeMonday9();
    await inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: NOW }));
    await inTenant((tx) => expireWaitlist(tx, AFTER_TTL));
    await inTenant((tx) => claimSlotOffer(tx, { startsAt: MONDAY_9, now: AFTER_TTL }));
    const results = await Promise.all([
      bookAppointment(db, booking(1, MONDAY_9, AFTER_TTL)),
      bookAppointment(db, booking(2, MONDAY_9, AFTER_TTL)),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toEqual({
      ok: false,
      error: AgendaError.slotTaken,
    });
  });

  it('entries past their window expire', async () => {
    await join(1);
    await inTenant((tx) => expireWaitlist(tx, LATER));
    const entry = await inTenant((tx) => tx.slotWaitlistEntry.findFirstOrThrow());
    expect(entry.status).toBe(WaitlistStatus.expired);
  });
});

describe('remarcação (metric 8)', () => {
  it('a move links the new appointment to the old one', async () => {
    const booked = await bookAppointment(db, booking(0, MONDAY_9));
    if (!booked.ok) throw new Error(booked.error);
    const moved = await rescheduleAppointment(db, {
      ...booking(0, MONDAY_10),
      appointmentId: booked.value.id,
    });
    if (!moved.ok) throw new Error(moved.error);
    const row = await inTenant((tx) =>
      tx.appointment.findUniqueOrThrow({ where: { id: moved.value.id } }),
    );
    expect(row.rescheduledFromId).toBe(booked.value.id);
  });

  it('booking again after cancelling counts as the remarcação of the cancelled one', async () => {
    await freeMonday9();
    const again = await bookAppointment(db, booking(0, MONDAY_10));
    if (!again.ok) throw new Error(again.error);
    const row = await inTenant((tx) =>
      tx.appointment.findUniqueOrThrow({ where: { id: again.value.id } }),
    );
    expect(row.rescheduledFromId).not.toBeNull();
    const other = await bookAppointment(db, booking(1, MONDAY_9));
    if (!other.ok) throw new Error(other.error);
    const fresh = await inTenant((tx) =>
      tx.appointment.findUniqueOrThrow({ where: { id: other.value.id } }),
    );
    expect(fresh.rescheduledFromId).toBeNull();
  });
});
