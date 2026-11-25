import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// E-22b and E-23: agenda view, manual booking (RF-48), availability, blocks, vacation.
// Receptionist views and books; the owner and the professional change the rules (H-18).

const DAY_MS = 86_400_000;
const MIN_DAYS_AHEAD = 3;
const MONDAY = 1;
const OFFSET = '-03:00';

let ctx: TestContext;
let owner: string;
let receptionist: string;
let tenantId: string;
let serviceId: string;

/** The next Monday at least three days away, as a local `YYYY-MM-DD`. */
function nextMonday(): string {
  for (let ahead = MIN_DAYS_AHEAD; ; ahead += 1) {
    const day = new Date(Date.now() + ahead * DAY_MS);
    const local = new Date(day.getTime() + Number(OFFSET.slice(0, 3)) * 3_600_000);
    if (local.getUTCDay() === MONDAY) return local.toISOString().slice(0, 10);
  }
}
const MONDAY_DAY = nextMonday();
const at = (time: string) => `${MONDAY_DAY}T${time}:00${OFFSET}`;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  receptionist = await joinAs(ctx, { ownerCookie: owner, tenantId, role: Role.receptionist });
  serviceId = await ctx.db.withTenant(tenantId, async (tx) => {
    await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    return service.id;
  });
});
afterAll(() => ctx.app.close());

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
const call = (method: Method, url: string, ...rest: [payload?: object, cookie?: string]) =>
  ctx.app.inject({
    method,
    url,
    headers: { cookie: rest[1] ?? owner },
    ...(rest[0] ? { payload: rest[0] } : {}),
  });

const WEEK = [{ weekday: MONDAY, start: '09:00', end: '12:00' }];
const newKey = () => ({ key: randomUUID() });

describe('availability rules', () => {
  it('saves several windows per day and reads them back, audited', async () => {
    const rules = [...WEEK, { weekday: MONDAY, start: '14:00', end: '18:00' }];
    expect((await call('PUT', '/api/availability', { rules })).statusCode).toBe(200);
    const read = (await call('GET', '/api/availability')).json<{ rules: object[] }>();
    expect(read.rules).toEqual(rules);
    const audits = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.findMany({ where: { entity: 'availability' } }),
    );
    expect(audits).toHaveLength(1);
    await call('PUT', '/api/availability', { rules: WEEK });
  });

  it('refuses overlapping or inverted windows', async () => {
    const overlap = [...WEEK, { weekday: MONDAY, start: '11:00', end: '13:00' }];
    expect((await call('PUT', '/api/availability', { rules: overlap })).statusCode).toBe(400);
    const inverted = [{ weekday: MONDAY, start: '12:00', end: '09:00' }];
    expect((await call('PUT', '/api/availability', { rules: inverted })).statusCode).toBe(400);
  });

  it('keeps the rules and the summary time for the owner and professional only', async () => {
    const denied = await call('PUT', '/api/availability', { rules: [] }, receptionist);
    expect(denied.statusCode).toBe(403);
    expect((await call('PUT', '/api/agenda/summary-time', { minute: 1080 })).statusCode).toBe(200);
    expect((await call('GET', '/api/availability')).json()).toMatchObject({
      nightlySummaryMinute: 1080,
    });
    const invalid = await call('PUT', '/api/agenda/summary-time', { minute: 1440 });
    expect(invalid.statusCode).toBe(400);
    const forbidden = await call('PUT', '/api/agenda/summary-time', { minute: 600 }, receptionist);
    expect(forbidden.statusCode).toBe(403);
  });
});

describe('manual booking (RF-48)', () => {
  it('lists the free slots of a day and books one for a new patient, same rules', async () => {
    const slots = (
      await call(
        'GET',
        `/api/agenda/slots?day=${MONDAY_DAY}&serviceId=${serviceId}`,
        undefined,
        receptionist,
      )
    ).json<{ slots: { startsAt: string }[] }>().slots;
    expect(slots).toHaveLength(3);
    const created = await call(
      'POST',
      '/api/agenda/appointments',
      {
        ...newKey(),
        serviceId,
        startsAt: at('09:00'),
        newPatient: { name: 'Paciente Fictício', phone: '+55 11 90000-0001' },
      },
      receptionist,
    );
    expect(created.statusCode).toBe(201);
    const day = await call('GET', `/api/agenda?from=${MONDAY_DAY}&days=1`, undefined, receptionist);
    expect(
      day.json<{ appointments: { patientName: string; createdBy: string }[] }>(),
    ).toMatchObject({
      appointments: [{ patientName: 'Paciente Fictício', createdBy: 'human' }],
    });
  });

  it('a taken slot is slot_taken (409), not a server error', async () => {
    const taken = await call('POST', '/api/agenda/appointments', {
      ...newKey(),
      serviceId,
      startsAt: at('09:00'),
      newPatient: { name: 'Outro Paciente Fictício', phone: '+55 11 90000-0002' },
    });
    expect(taken.statusCode).toBe(409);
    expect(taken.json()).toEqual({ error: 'slot_taken' });
    const outside = await call('POST', '/api/agenda/appointments', {
      ...newKey(),
      serviceId,
      startsAt: at('20:00'),
      newPatient: { name: 'Fora do Horário', phone: '+55 11 90000-0003' },
    });
    expect(outside.json()).toEqual({ error: 'horario_indisponivel' });
  });

  it('reschedules and cancels without the patient notice window', async () => {
    const patient = await ctx.db.withTenant(tenantId, (tx) =>
      tx.contact.create({
        data: { tenantId, name: 'Paciente Remarcado', bsuid: `BR.${randomUUID()}` },
      }),
    );
    const booked = await call('POST', '/api/agenda/appointments', {
      ...newKey(),
      serviceId,
      startsAt: at('10:00'),
      contactId: patient.id,
    });
    const { id } = booked.json<{ id: string }>();
    const moved = await call('POST', `/api/agenda/appointments/${id}/reschedule`, {
      ...newKey(),
      startsAt: at('11:00'),
    });
    expect(moved.statusCode).toBe(200);
    const moveId = moved.json<{ id: string }>().id;
    const cancelled = await call('POST', `/api/agenda/appointments/${moveId}/cancel`, {});
    expect(cancelled.statusCode).toBe(200);
    const slots = (
      await call('GET', `/api/agenda/slots?day=${MONDAY_DAY}&serviceId=${serviceId}`)
    ).json<{ slots: unknown[] }>().slots;
    expect(slots).toHaveLength(2);
  });

  it('repeating the same key does not book twice', async () => {
    const body = {
      ...newKey(),
      serviceId,
      startsAt: at('11:00'),
      newPatient: { name: 'Uma vez', phone: '+55 11 90000-0004' },
    };
    const first = await call('POST', '/api/agenda/appointments', body);
    const again = await call('POST', '/api/agenda/appointments', body);
    expect(again.json<{ id: string }>().id).toBe(first.json<{ id: string }>().id);
  });
});

describe('blocks and vacation', () => {
  it('a block removes its slots; a vacation does too', async () => {
    const block = await call('POST', '/api/time-offs', {
      kind: 'block',
      fromDay: MONDAY_DAY,
      toDay: MONDAY_DAY,
      fromTime: '10:00',
      toTime: '12:00',
      reason: 'Feriado',
    });
    expect(block.statusCode).toBe(201);
    const url = `/api/agenda/slots?day=${MONDAY_DAY}&serviceId=${serviceId}`;
    expect((await call('GET', url)).json<{ slots: unknown[] }>().slots).toHaveLength(0);
    const { id } = block.json<{ id: string }>();
    expect((await call('DELETE', `/api/time-offs/${id}`)).statusCode).toBe(200);
    const vacation = await call('POST', '/api/time-offs', {
      kind: 'vacation',
      fromDay: MONDAY_DAY,
      toDay: MONDAY_DAY,
    });
    expect(vacation.json<{ conflicts: number }>().conflicts).toBeGreaterThan(0);
    expect((await call('GET', url)).json<{ slots: unknown[] }>().slots).toHaveLength(0);
    const listed = (await call('GET', '/api/time-offs')).json<{ timeOffs: { kind: string }[] }>();
    expect(listed.timeOffs.map((off) => off.kind)).toEqual(['vacation']);
  });

  it('refuses inverted periods, partial-day vacations and the receptionist', async () => {
    const base = { kind: 'block', fromDay: MONDAY_DAY, toDay: MONDAY_DAY };
    expect(
      (
        await call('POST', '/api/time-offs', {
          ...base,
          fromDay: '2099-01-02',
          toDay: '2099-01-01',
        })
      ).statusCode,
    ).toBe(400);
    const partial = { ...base, kind: 'vacation', fromTime: '09:00' };
    expect((await call('POST', '/api/time-offs', partial)).statusCode).toBe(400);
    expect((await call('POST', '/api/time-offs', base, receptionist)).statusCode).toBe(403);
  });
});

describe('tenant isolation', () => {
  it('another clinic sees none of it and cannot touch it', async () => {
    const other = await signUpVerified(ctx);
    await createTenant(ctx, other);
    const day = await call('GET', `/api/agenda?from=${MONDAY_DAY}&days=7`, undefined, other);
    expect(day.json()).toMatchObject({ appointments: [], timeOffs: [] });
    const [{ id }] = (await call('GET', '/api/time-offs')).json<{ timeOffs: { id: string }[] }>()
      .timeOffs as [{ id: string }];
    expect((await call('DELETE', `/api/time-offs/${id}`, undefined, other)).statusCode).toBe(404);
    const appointment = await ctx.db.withTenant(tenantId, (tx) =>
      tx.appointment.findFirstOrThrow(),
    );
    const cancel = await call(
      'POST',
      `/api/agenda/appointments/${appointment.id}/cancel`,
      {},
      other,
    );
    expect(cancel.statusCode).toBe(404);
  });
});
