import { Plan } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';

// Spec 05 and 10, "Agenda por profissional": plan ceiling on professionals, hours and services
// per professional, slots and the agenda carrying the professional. Fictitious data only.

const DAY_MS = 86_400_000;
const MIN_DAYS_AHEAD = 3;
const MONDAY = 1;
const OFFSET_HOURS = -3;
const FIRST_NAME = 'Pessoa Teste';

let ctx: TestContext;
let owner: string;
let tenantId: string;
let first: string;
let session: string;
let assessment: string;

function nextMonday(): string {
  for (let ahead = MIN_DAYS_AHEAD; ; ahead += 1) {
    const local = new Date(Date.now() + ahead * DAY_MS + OFFSET_HOURS * 3_600_000);
    if (local.getUTCDay() === MONDAY) return local.toISOString().slice(0, 10);
  }
}
const MONDAY_DAY = nextMonday();

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  ({ first, session, assessment } = await ctx.db.withTenant(tenantId, async (tx) => {
    // createTenant already made the first professional ("Pessoa Teste").
    const professional = await tx.professional.findFirstOrThrow();
    const services = await Promise.all(
      ['Sessão', 'Avaliação'].map((name) =>
        tx.service.create({ data: { tenantId, name, durationMinutes: 60, priceCents: 18_000 } }),
      ),
    );
    return {
      first: professional.id,
      session: services[0]?.id ?? '',
      assessment: services[1]?.id ?? '',
    };
  }));
});
afterAll(() => ctx.app.close());

type Method = 'GET' | 'POST' | 'PUT';
const call = (method: Method, url: string, payload?: object) =>
  ctx.app.inject({ method, url, headers: { cookie: owner }, ...(payload ? { payload } : {}) });

const setPlan = (plan: Plan) =>
  ctx.db.client.tenant.update({ where: { id: tenantId }, data: { plan } });

let second = '';

describe('professionals per plan', () => {
  it('Agenda keeps one professional; Clínica adds more', async () => {
    await setPlan(Plan.agenda);
    const refused = await call('POST', '/api/professionals', { name: 'Bruno Exemplo' });
    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toEqual({ error: 'plan_limit' });
    await setPlan(Plan.clinica);
    const added = await call('POST', '/api/professionals', { name: 'Bruno Exemplo' });
    expect(added.statusCode).toBe(201);
    second = added.json<{ id: string }>().id;
  });
});

describe('hours and services per professional', () => {
  it('each professional keeps their own weekly windows', async () => {
    await call('PUT', '/api/availability', {
      rules: [{ weekday: MONDAY, start: '09:00', end: '10:00' }],
    });
    await call('PUT', '/api/availability', {
      professionalId: second,
      rules: [{ weekday: MONDAY, start: '14:00', end: '15:00' }],
    });
    const mine = (await call('GET', `/api/availability?professionalId=${first}`)).json<{
      rules: { start: string }[];
    }>();
    const theirs = (await call('GET', `/api/availability?professionalId=${second}`)).json<{
      rules: { start: string }[];
    }>();
    expect(mine.rules.map((rule) => rule.start)).toEqual(['09:00']);
    expect(theirs.rules.map((rule) => rule.start)).toEqual(['14:00']);
  });

  it('saves the services a professional performs; empty means all', async () => {
    const path = `/api/professionals/${second}/services`;
    expect((await call('GET', path)).json()).toEqual({ serviceIds: [] });
    expect((await call('PUT', path, { serviceIds: [session] })).statusCode).toBe(200);
    expect((await call('GET', path)).json()).toEqual({ serviceIds: [session] });
  });

  it('lists slots across professionals who perform the service, with the name', async () => {
    const slots = (
      await call('GET', `/api/agenda/slots?day=${MONDAY_DAY}&serviceId=${session}`)
    ).json<{
      slots: { professionalName: string }[];
    }>();
    expect(slots.slots.map((slot) => slot.professionalName)).toEqual([FIRST_NAME, 'Bruno Exemplo']);
    const only = (
      await call('GET', `/api/agenda/slots?day=${MONDAY_DAY}&serviceId=${assessment}`)
    ).json<{ slots: { professionalName: string }[] }>();
    expect(only.slots.map((slot) => slot.professionalName)).toEqual([FIRST_NAME]);
  });

  it('books with the chosen professional and the agenda shows who', async () => {
    const booked = await call('POST', '/api/agenda/appointments', {
      key: crypto.randomUUID(),
      serviceId: session,
      professionalId: second,
      startsAt: `${MONDAY_DAY}T14:00:00-03:00`,
      newPatient: { name: 'Paciente Fictício', phone: '11 99999-0001' },
    });
    expect(booked.statusCode).toBe(201);
    const agenda = (await call('GET', `/api/agenda?from=${MONDAY_DAY}`)).json<{
      professionals: { id: string }[];
      appointments: { professionalId: string }[];
    }>();
    expect(agenda.professionals.map((one) => one.id)).toEqual([first, second]);
    expect(agenda.appointments.map((one) => one.professionalId)).toEqual([second]);
  });
});
