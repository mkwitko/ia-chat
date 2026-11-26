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

// Clientes, attendance, Início and Resultados (spec 10): derived status, isolation, audit.

const DAY = 86_400_000;
let ctx: TestContext;
let owner: string;
let receptionist: string;
let tenantId: string;
let serviceId: string;
let channelId: string;
let other: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  receptionist = await joinAs(ctx, { ownerCookie: owner, tenantId, role: Role.receptionist });
  other = await signUpVerified(ctx);
  await createTenant(ctx, other);
  ({ serviceId, channelId } = await ctx.db.withTenant(tenantId, async (tx) => {
    await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const channel = await tx.channel.create({
      data: { tenantId, kind: 'cloud_api', status: 'connected' },
    });
    return { serviceId: service.id, channelId: channel.id };
  }));
});
afterAll(() => ctx.app.close());

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT';
const call = (method: Method, url: string, ...rest: [payload?: object, cookie?: string]) =>
  ctx.app.inject({
    method,
    url,
    headers: { cookie: rest[1] ?? owner },
    ...(rest[0] ? { payload: rest[0] } : {}),
  });

interface Customer {
  id: string;
  name: string | null;
  stage: string;
  optedOut: boolean;
  origin: string;
}
const customers = async (query = '', cookie = owner) =>
  (await call('GET', `/api/customers${query}`, undefined, cookie)).json<Customer[]>();

let phoneSeq = 10_000_000;
async function newContact(name: string, createdDaysAgo = 0) {
  return ctx.db.withTenant(tenantId, async (tx) => {
    const contact = await tx.contact.create({
      data: {
        tenantId,
        name,
        bsuid: `BR.${randomUUID()}`,
        phoneE164: `+5541${String(phoneSeq++).padStart(8, '9')}`,
        createdAt: new Date(Date.now() - createdDaysAgo * DAY),
      },
    });
    return contact.id;
  });
}

async function appointmentFor(contactId: string, hoursFromNow: number) {
  return ctx.db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.findFirstOrThrow();
    const startsAt = new Date(Date.now() + hoursFromNow * 3_600_000);
    const row = await tx.appointment.create({
      data: {
        tenantId,
        professionalId: professional.id,
        contactId,
        serviceId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3_600_000),
      },
    });
    return row.id;
  });
}

describe('customers list', () => {
  it('derives the status from facts, searches and filters', async () => {
    const fresh = await newContact('Ana Nova');
    const quiet = await newContact('Bruno Sumido', 10);
    const booked = await newContact('Carla Agendada');
    await appointmentFor(booked, 48);
    const byName: Record<string, Customer | undefined> = Object.fromEntries(
      (await customers()).map((c) => [c.name ?? '', c]),
    );
    expect(byName['Ana Nova']).toMatchObject({
      id: fresh,
      stage: 'new_contact',
      origin: 'whatsapp_direct',
    });
    expect(byName['Bruno Sumido']).toMatchObject({ id: quiet, stage: 'not_booked' });
    expect(byName['Carla Agendada']?.stage).toBe('booked');
    expect((await customers('?q=bruno')).map((c) => c.name)).toEqual(['Bruno Sumido']);
    expect((await customers('?stage=booked')).map((c) => c.name)).toEqual(['Carla Agendada']);
    expect((await call('GET', '/api/customers?stage=nope')).statusCode).toBe(400);
  });

  it('keeps another consultório out: empty list, 404 on detail, edit and attendance', async () => {
    const mine = await newContact('Dani Isolada');
    const appointment = await appointmentFor(mine, -2);
    expect(await customers('?q=Isolada', other)).toHaveLength(0);
    expect((await call('GET', `/api/customers/${mine}`, undefined, other)).statusCode).toBe(404);
    const edit = await call('PATCH', `/api/customers/${mine}`, { name: 'X' }, other);
    expect(edit.statusCode).toBe(404);
    const consent = await call(
      'POST',
      `/api/customers/${mine}/consent`,
      { kind: 'opt_out' },
      other,
    );
    expect(consent.statusCode).toBe(404);
    const mark = await call(
      'POST',
      `/api/agenda/appointments/${appointment}/attendance`,
      { outcome: 'attended' },
      other,
    );
    expect(mark.statusCode).toBe(404);
  });
});

describe('customer changes', () => {
  it('edits origin and audits; needs a reason to mark lost; returns to automatic', async () => {
    const id = await newContact('Eva Indicada');
    const edited = await call('PATCH', `/api/customers/${id}`, {
      origin: 'referral',
      originRef: 'AMIGA10',
    });
    expect(edited.statusCode).toBe(200);
    expect(await call('POST', `/api/customers/${id}/stage`, { stage: 'lost' })).toMatchObject({
      statusCode: 400,
    });
    const lost = await call('POST', `/api/customers/${id}/stage`, {
      stage: 'lost',
      lostReason: 'price',
    });
    expect(lost.json()).toEqual({ stage: 'lost' });
    const detail = (await call('GET', `/api/customers/${id}`)).json<{
      stage: string;
      origin: string;
      originRef: string;
      stages: { source: string }[];
    }>();
    expect(detail).toMatchObject({ stage: 'lost', origin: 'referral', originRef: 'AMIGA10' });
    expect(detail.stages[0]?.source).toBe('manual');
    const back = await call('POST', `/api/customers/${id}/stage`, { stage: null });
    expect(back.json()).toEqual({ stage: 'new_contact' });
    const audits = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.count({ where: { entity: 'contact', entityId: id } }),
    );
    expect(audits).toBe(3);
  });

  it('logs consent changes and shows them in the detail; the receptionist may, a stranger may not', async () => {
    const id = await newContact('Fábio Parar');
    expect(
      (await call('POST', `/api/customers/${id}/consent`, { kind: 'opt_out' }, receptionist))
        .statusCode,
    ).toBe(200);
    expect((await customers('?q=Fábio')).at(0)?.optedOut).toBe(true);
    // The owner cannot bring consent back; only the client can, by writing.
    expect(
      (await call('POST', `/api/customers/${id}/consent`, { kind: 'opt_in' })).statusCode,
    ).toBe(400);
    const detail = (await call('GET', `/api/customers/${id}`)).json<{
      optedOut: boolean;
      consent: { kind: string; source: string; actorType: string }[];
    }>();
    expect(detail.optedOut).toBe(true);
    expect(detail.consent.map((e) => e.kind)).toEqual(['opt_out']);
    expect(detail.consent[0]).toMatchObject({ source: 'owner_panel', actorType: 'user' });
  });
});

describe('attendance and the month on Início', () => {
  it('marks compareceu, refuses a future one, and feeds the status and the results', async () => {
    const id = await newContact('Gil Compareceu');
    const past = await appointmentFor(id, -6);
    const future = await appointmentFor(id, 72);
    const mark = (appointment: string, outcome: string) =>
      call('POST', `/api/agenda/appointments/${appointment}/attendance`, { outcome });
    expect((await mark(future, 'attended')).statusCode).toBe(409);
    expect((await mark(past, 'attended')).json()).toMatchObject({ status: 'completed' });
    expect((await customers('?q=Gil')).at(0)?.stage).toBe('attended');
    const home = (await call('GET', '/api/home')).json<{
      month: { contacts: number; booked: number };
      attention: { toMark: unknown[] };
      recovered: { count: number; minSample: number };
    }>();
    expect(home.recovered).toMatchObject({ count: 0, minSample: 5 });
    expect(home.month.contacts).toBeGreaterThanOrEqual(1);
    expect(home.month.booked).toBeGreaterThanOrEqual(2);
    const results = (await call('GET', '/api/results')).json<{
      minSample: number;
      attendance: { attended: number };
      recoveredMoney: { weeks: unknown[] };
    }>();
    expect(results.minSample).toBe(5);
    expect(results.recoveredMoney.weeks).toEqual([]);
    expect(results.attendance.attended).toBeGreaterThanOrEqual(1);
    expect((await call('GET', '/api/results?period=nope')).statusCode).toBe(400);
    const report = '/api/notifications/weekly-report';
    expect((await call('GET', report)).json()).toEqual({ enabled: true });
    expect((await call('PUT', report, { enabled: false })).statusCode).toBe(200);
    expect((await call('GET', report)).json()).toEqual({ enabled: false });
  });

  it('measures the first answer and the hand-off from messages and control changes', async () => {
    const id = await newContact('Hugo Conversa');
    await ctx.db.withTenant(tenantId, async (tx) => {
      const conversation = await tx.conversation.create({
        data: { tenantId, channelId, contactId: id },
      });
      const base = { tenantId, conversationId: conversation.id, channelId, type: 'text' as const };
      const at = Date.now() - 60_000;
      await tx.message.create({
        data: {
          ...base,
          direction: 'inbound',
          author: 'patient',
          status: 'received',
          createdAt: new Date(at),
        },
      });
      await tx.message.create({
        data: {
          ...base,
          direction: 'outbound',
          author: 'ai',
          status: 'sent',
          createdAt: new Date(at + 30_000),
        },
      });
    });
    const results = (await call('GET', '/api/results')).json<{
      conversations: number;
      firstResponse: { sample: number; medianSeconds: number };
      escalation: { handedOff: number; total: number };
    }>();
    expect(results.conversations).toBeGreaterThanOrEqual(1);
    expect(results.firstResponse.sample).toBeGreaterThanOrEqual(1);
    expect(results.firstResponse.medianSeconds).toBeGreaterThan(0);
    expect(results.escalation.handedOff).toBe(0);
  });
});
