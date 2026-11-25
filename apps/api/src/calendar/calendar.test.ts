import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';
import { signState, verifyState } from './state.ts';

// E-21: connect flow, calendar choice, disconnect and the panel booking path. Google is a fake
// `fetch`: no network.

const KEY = randomBytes(32).toString('base64');
const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const BASE = '/api/calendar/google';
const DAY_MS = 86_400_000;

interface Sent {
  url: string;
  body: string;
}
const sent: Sent[] = [];
let insertStatus = 200;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Answers the few Google calls the flow makes. */
const fakeGoogle: typeof fetch = async (url, init) => {
  const target = url instanceof Request ? url.url : url.toString();
  sent.push({ url: target, body: await new Response(init?.body).text() });
  if (target.includes('/token'))
    return Promise.resolve(
      json({ access_token: 'access-1', expires_in: 3600, refresh_token: 'refresh-secret' }),
    );
  if (target.includes('calendarList'))
    return Promise.resolve(
      json({ items: [{ id: 'cal-1', summary: 'Atendimentos', accessRole: 'owner' }] }),
    );
  if (target.endsWith('/freeBusy'))
    return Promise.resolve(json({ calendars: { 'cal-1': { busy: [] } } }));
  if (target.endsWith('/events')) return Promise.resolve(json({}, insertStatus));
  return Promise.resolve(json({}));
};

let ctx: TestContext;
let off: TestContext;
let owner: string;
let receptionist: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, {
    calendarFetch: fakeGoogle,
    env: { GOOGLE_CLIENT_ID: 'client', GOOGLE_CLIENT_SECRET: 'secret', GOOGLE_TOKEN_KEY: KEY },
  });
  off = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  receptionist = await joinAs(ctx, { ownerCookie: owner, tenantId, role: Role.receptionist });
});
afterAll(async () => {
  await ctx.app.close();
  await off.app.close();
});

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
const call = (method: Method, url: string, ...rest: [cookie?: string, payload?: object]) =>
  ctx.app.inject({
    method,
    url,
    headers: { cookie: rest[0] ?? owner },
    ...(rest[1] ? { payload: rest[1] } : {}),
  });
const stateOf = async () => (await call('GET', BASE)).json<{ state: string }>().state;

describe('oauth state', () => {
  it('binds tenant and user, and rejects tampering and expiry', () => {
    const now = new Date();
    const state = signState({ tenantId: 't', userId: 'u', secret: SECRET, now });
    expect(verifyState({ state, secret: SECRET, now })).toEqual({ tenantId: 't', userId: 'u' });
    expect(verifyState({ state: `${state}x`, secret: SECRET, now })).toBeNull();
    expect(verifyState({ state, secret: 'another-secret', now })).toBeNull();
    const later = new Date(now.getTime() + DAY_MS);
    expect(verifyState({ state, secret: SECRET, now: later })).toBeNull();
  });
});

describe('without credentials', () => {
  it('the feature is off and connecting answers 503', async () => {
    const cookie = await signUpVerified(off);
    await createTenant(off, cookie);
    const status = await off.app.inject({ method: 'GET', url: BASE, headers: { cookie } });
    expect(status.json()).toEqual({ state: 'off', calendarName: null });
    const connect = await off.app.inject({
      method: 'POST',
      url: `${BASE}/connect`,
      headers: { cookie },
    });
    expect(connect.statusCode).toBe(503);
  });
});

describe('connect, choose and disconnect', () => {
  it('only the owner side may connect; the receptionist reads the status only', async () => {
    expect((await call('POST', `${BASE}/connect`, receptionist)).statusCode).toBe(403);
    expect((await call('GET', BASE, receptionist)).statusCode).toBe(200);
  });

  it('a callback with a forged state stores nothing', async () => {
    const url = `${BASE}/callback?code=abc&state=forged.state`;
    const response = await ctx.app.inject({ method: 'GET', url, headers: { cookie: owner } });
    expect(response.headers.location).toContain('google=erro');
    expect(await stateOf()).toBe('not_connected');
  });

  it('connects with the minimal scopes, stores tokens encrypted, picks the calendar', async () => {
    const connect = (await call('POST', `${BASE}/connect`)).json<{ url: string }>();
    const url = new URL(connect.url);
    expect(url.searchParams.get('scope')).toContain('calendar.events.freebusy');
    expect(url.searchParams.get('scope')).not.toContain('auth/calendar ');
    const state = url.searchParams.get('state') ?? '';
    const back = await ctx.app.inject({
      method: 'GET',
      url: `${BASE}/callback?code=abc&state=${encodeURIComponent(state)}`,
      headers: { cookie: owner },
    });
    expect(back.headers.location).toContain('google=ok');
    const row = await ctx.db.withTenant(tenantId, (tx) =>
      tx.calendarIntegration.findFirstOrThrow(),
    );
    expect(row.refreshTokenEnc).not.toContain('refresh-secret');
    expect(await stateOf()).toBe('choose_calendar');

    const calendars = (await call('GET', `${BASE}/calendars`)).json<{
      calendars: { id: string }[];
    }>();
    expect(calendars.calendars.map((one) => one.id)).toEqual(['cal-1']);
    const refused = await call('PUT', `${BASE}/calendar`, owner, { calendarId: 'someone-elses' });
    expect(refused.statusCode).toBe(400);
    await call('PUT', `${BASE}/calendar`, owner, { calendarId: 'cal-1' });
    expect(await stateOf()).toBe('connected');
  });

  it('a revoked integration shows the reconnect state', async () => {
    await ctx.db.withTenant(tenantId, (tx) =>
      tx.calendarIntegration.updateMany({ data: { status: 'needs_reconnect' } }),
    );
    expect(await stateOf()).toBe('needs_reconnect');
    await ctx.db.withTenant(tenantId, (tx) =>
      tx.calendarIntegration.updateMany({ data: { status: 'connected' } }),
    );
  });
});

describe('panel booking goes through the same calendar path', () => {
  const MONDAY = 1;
  const monday = () => {
    for (let ahead = 3; ; ahead += 1) {
      const day = new Date(Date.now() + ahead * DAY_MS);
      if (day.getUTCDay() === MONDAY) return day.toISOString().slice(0, 10);
    }
  };

  async function seedAgenda() {
    return ctx.db.withTenant(tenantId, async (tx) => {
      // Creating the organization already makes the first professional, whom the agenda uses.
      const professional = await tx.professional.findFirstOrThrow({
        orderBy: { createdAt: 'asc' },
      });
      await tx.availabilityRule.create({
        data: {
          tenantId,
          professionalId: professional.id,
          weekday: MONDAY,
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T12:00:00Z'),
        },
      });
      const service = await tx.service.create({
        data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
      });
      const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
      return { serviceId: service.id, contactId: contact.id };
    });
  }

  it('writes the event with the derived id; a Google failure is not confirmed', async () => {
    const { serviceId, contactId } = await seedAgenda();
    const startsAt = `${monday()}T09:00:00-03:00`;
    const ok = await call('POST', '/api/agenda/appointments', owner, {
      key: randomUUID(),
      serviceId,
      startsAt,
      contactId,
    });
    expect(ok.statusCode).toBe(201);
    const { id } = ok.json<{ id: string }>();
    const insert = sent.findLast((one) => one.url.endsWith('/events'));
    expect((JSON.parse(insert?.body ?? '{}') as { id: string }).id).toBe(id.replaceAll('-', ''));

    insertStatus = 500;
    const failed = await call('POST', '/api/agenda/appointments', owner, {
      key: randomUUID(),
      serviceId,
      startsAt: `${monday()}T10:00:00-03:00`,
      contactId,
    });
    insertStatus = 200;
    expect(failed.statusCode).toBe(409);
    expect(failed.json()).toEqual({ error: 'agendamento_nao_sincronizado' });
  });
});
