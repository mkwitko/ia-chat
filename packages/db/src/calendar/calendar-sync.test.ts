import { randomBytes, randomUUID } from 'node:crypto';
import { FakeCalendar, FakeFailure, eventIdFor, encryptToken } from '@app/core';
import { AlertEvent } from '@app/observability';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AgendaError,
  bookAppointment,
  cancelAppointment,
  createCalendarResolver,
  createDb,
  loadScope,
  rescheduleAppointment,
  slotsIn,
  type BookRequest,
  type CalendarLink,
} from '../index.ts';
import {
  AppointmentCreator,
  CalendarStatus,
  CalendarSyncState,
} from '../../generated/prisma/enums.ts';

// E-21 with the in-memory fake: Google is the source of availability, no network.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 8 });
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-01-01T12:00:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const MONDAY_10 = new Date('2027-01-04T13:00:00Z');
const MONDAY_11 = new Date('2027-01-04T14:00:00Z');
const HOUR_MS = 3_600_000;
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);
const KEY = randomBytes(32).toString('base64');

let tenantId = '';
let serviceId = '';
let contacts: string[] = [];
const onFailure = vi.fn(() => Promise.resolve());
let google = new FakeCalendar();
let link: CalendarLink = linkOf(google);

function linkOf(provider: FakeCalendar): CalendarLink {
  return { provider, calendarId: 'atendimentos', onFailure };
}

beforeEach(async () => {
  google = new FakeCalendar();
  link = linkOf(google);
  onFailure.mockClear();
  const tenant = await db.client.tenant.create({
    data: { name: 'Agenda Google (fictício)', slug: `gc-${randomUUID()}` },
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
  calendar: link,
});

const rowOf = (id: string) =>
  db.withTenant(tenantId, (tx) => tx.appointment.findUniqueOrThrow({ where: { id } }));

async function booked(contact: number, startsAt: Date) {
  const result = await bookAppointment(db, request(contact, startsAt));
  if (!result.ok) throw new Error('setup booking failed');
  return result.value;
}

describe('availability with Google', () => {
  it('offered slots are our rules minus Google busy', async () => {
    google.externalBusy = [{ start: MONDAY_10, end: new Date(MONDAY_10.getTime() + HOUR_MS) }];
    const scope = await db.withTenant(tenantId, async (tx) =>
      slotsIn(tx, {
        ...(await loadScope(tx)),
        durationMinutes: 60,
        from: MONDAY_9,
        to: new Date(MONDAY_9.getTime() + 3 * HOUR_MS),
        now: NOW,
        calendar: link,
      }),
    );
    expect(scope.map((slot) => slot.start)).toEqual([MONDAY_9, MONDAY_11]);
  });

  it('revalidates right before booking: a slot busy on Google is refused, nothing is written', async () => {
    google.externalBusy = [{ start: MONDAY_9, end: new Date(MONDAY_9.getTime() + HOUR_MS) }];
    const result = await bookAppointment(db, request(0, MONDAY_9));
    expect(result).toEqual({ ok: false, error: AgendaError.slotUnavailable });
    expect(google.insertCalls).toBe(0);
    expect(await db.withTenant(tenantId, (tx) => tx.appointment.count())).toBe(0);
  });

  it('a calendar that cannot be read offers and books nothing', async () => {
    google.failWith = FakeFailure.down;
    const result = await bookAppointment(db, request(0, MONDAY_9));
    expect(result).toEqual({ ok: false, error: AgendaError.calendarUnavailable });
    expect(await db.withTenant(tenantId, (tx) => tx.appointment.count())).toBe(0);
  });
});

describe('booking writes the Google event', () => {
  it('stores the deterministic event id and marks the appointment synced', async () => {
    const view = await booked(0, MONDAY_9);
    const row = await rowOf(view.id);
    expect(row.googleEventId).toBe(eventIdFor(view.id));
    expect(row.calendarSync).toBe(CalendarSyncState.synced);
    expect(google.events.get(eventIdFor(view.id))?.startsAt).toEqual(MONDAY_9);
  });

  it('double booking of one slot: one wins and Google gets one insert', async () => {
    const results = await Promise.all(
      [0, 1, 2].map((contact) => bookAppointment(db, request(contact, MONDAY_9))),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(google.insertCalls).toBe(1);
    expect(google.events.size).toBe(1);
  });

  it('Google failure: no confirmation, appointment marked not synced; a retry completes it once', async () => {
    google.failWith = FakeFailure.down;
    // freeBusy also fails while down; let it through and fail only the write.
    const reads = google.freeBusy.bind(google);
    google.freeBusy = async (range) => {
      google.failWith = null;
      const busy = await reads(range);
      google.failWith = FakeFailure.down;
      return busy;
    };
    const key = randomUUID();
    const first = await bookAppointment(db, { ...request(0, MONDAY_9), key });
    expect(first).toEqual({ ok: false, error: AgendaError.notSynced });
    const [row] = await db.withTenant(tenantId, (tx) => tx.appointment.findMany());
    expect(row?.calendarSync).toBe(CalendarSyncState.failed);

    google.failWith = null;
    const retry = await bookAppointment(db, { ...request(0, MONDAY_9), key });
    expect(retry.ok && retry.value.id === row?.id).toBe(true);
    expect(google.events.size).toBe(1);
    expect((await rowOf(row?.id ?? '')).calendarSync).toBe(CalendarSyncState.synced);
  });

  it('a retry with the same key never duplicates the event', async () => {
    const key = randomUUID();
    await bookAppointment(db, { ...request(0, MONDAY_9), key });
    await bookAppointment(db, { ...request(0, MONDAY_9), key });
    expect(google.events.size).toBe(1);
    expect(await db.withTenant(tenantId, (tx) => tx.appointment.count())).toBe(1);
  });
});

describe('reschedule and cancel follow the event', () => {
  it('cancel deletes the Google event', async () => {
    const view = await booked(0, MONDAY_9);
    await cancelAppointment(db, {
      tenantId,
      contactId: contacts[0] ?? '',
      appointmentId: view.id,
      now: NOW,
      calendar: link,
    });
    expect(google.events.size).toBe(0);
    expect((await rowOf(view.id)).googleEventId).toBeNull();
  });

  it('reschedule writes the new event and removes the old one', async () => {
    const view = await booked(0, MONDAY_9);
    const moved = await rescheduleAppointment(db, {
      ...request(0, MONDAY_11),
      appointmentId: view.id,
    });
    expect(moved.ok).toBe(true);
    expect([...google.events.values()].map((event) => event.startsAt)).toEqual([MONDAY_11]);
  });

  it('a failed delete is flagged, the cancellation itself stands', async () => {
    const view = await booked(0, MONDAY_9);
    google.failWith = FakeFailure.down;
    const result = await cancelAppointment(db, {
      tenantId,
      contactId: contacts[0] ?? '',
      appointmentId: view.id,
      now: NOW,
      calendar: link,
    });
    expect(result.ok).toBe(true);
    const row = await rowOf(view.id);
    expect(row.status).toBe('cancelled');
    expect(row.calendarSync).toBe(CalendarSyncState.failed);
  });
});

describe('revoked token', () => {
  const revokedFetch: typeof fetch = () =>
    Promise.resolve(new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }));

  async function connect() {
    await db.withTenant(tenantId, (tx) =>
      tx.calendarIntegration.create({
        data: {
          tenantId,
          refreshTokenEnc: encryptToken('refresh', KEY),
          calendarId: 'atendimentos',
        },
      }),
    );
  }

  it('offers nothing, flips to needs_reconnect, alerts once, and keeps refusing', async () => {
    await connect();
    const alert = vi.fn();
    const fetchSpy = vi.fn<typeof fetch>(revokedFetch);
    const resolve = createCalendarResolver({
      db,
      config: { clientId: 'id', clientSecret: 'secret', tokenKey: KEY },
      alert,
      fetch: fetchSpy,
    });
    const first = await resolve(tenantId);
    const result = await bookAppointment(db, {
      ...request(0, MONDAY_9),
      calendar: first ?? undefined,
    });
    expect(result).toEqual({ ok: false, error: AgendaError.calendarUnavailable });
    const row = await db.withTenant(tenantId, (tx) =>
      tx.calendarIntegration.findUniqueOrThrow({ where: { tenantId } }),
    );
    expect(row.status).toBe(CalendarStatus.needs_reconnect);
    expect(alert).toHaveBeenCalledWith(AlertEvent.calendarDisconnected, { tenantId });
    expect(alert).toHaveBeenCalledOnce();

    const second = await resolve(tenantId);
    await bookAppointment(db, { ...request(0, MONDAY_9), calendar: second ?? undefined });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(alert).toHaveBeenCalledOnce();
  });

  it('no integration: our own rules; connected without a calendar chosen: nothing is offered', async () => {
    const resolve = createCalendarResolver({
      db,
      config: { clientId: 'id', clientSecret: 'secret', tokenKey: KEY },
    });
    expect(await resolve(tenantId)).toBeNull();
    await db.withTenant(tenantId, (tx) =>
      tx.calendarIntegration.create({
        data: { tenantId, refreshTokenEnc: encryptToken('refresh', KEY) },
      }),
    );
    const link = await resolve(tenantId);
    const result = await bookAppointment(db, {
      ...request(0, MONDAY_9),
      calendar: link ?? undefined,
    });
    expect(result).toEqual({ ok: false, error: AgendaError.calendarUnavailable });
  });
});
