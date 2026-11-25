import { randomBytes, randomInt } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// E-24: "Conectar WhatsApp". The Graph API is a fake `fetch`: no network.

const KEY = randomBytes(32).toString('base64');
const PATH = '/api/whatsapp';
const TOKEN = 'business-token-secret';
const BEARER = `Bearer ${TOKEN}`;
const POST = 'POST';
const ENV = {
  META_APP_ID: '1234',
  META_APP_SECRET: 'app-secret',
  META_ES_CONFIG_ID: '5678',
  META_TOKEN_KEY: KEY,
};
const digits = () => String(randomInt(1e9, 9e9));

interface Call {
  method: string;
  url: string;
  auth: string | null;
}
const calls: Call[] = [];
let subscribeStatus = 200;
let funded = true;
let phoneNumberId = digits();

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const PAYMENT_ERROR = { error: { code: 131042, message: 'payment' } };

const fakeGraph: typeof fetch = (url, init) => {
  const target = url instanceof Request ? url.url : url.toString();
  const auth = new Headers(init?.headers).get('authorization');
  calls.push({ method: init?.method ?? 'GET', url: target, auth });
  if (target.includes('/oauth/access_token')) return Promise.resolve(json({ access_token: TOKEN }));
  if (target.includes('/phone_numbers'))
    return Promise.resolve(
      json({ data: [{ id: phoneNumberId, display_phone_number: '+55 11 90000-0000' }] }),
    );
  if (target.endsWith('/subscribed_apps'))
    return Promise.resolve(
      json(subscribeStatus === 200 ? { success: true } : PAYMENT_ERROR, subscribeStatus),
    );
  if (target.includes('?fields=primary_funding_id'))
    return Promise.resolve(json(funded ? { primary_funding_id: '99', id: '1' } : { id: '1' }));
  if (target.includes('/message_templates?')) return Promise.resolve(json({ data: [] }));
  return Promise.resolve(json({ success: true }));
};

let ctx: TestContext;
let off: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, {
    metaFetch: fakeGraph,
    env: ENV,
  });
  off = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(async () => {
  await ctx.app.close();
  await off.app.close();
});
beforeEach(() => {
  calls.length = 0;
  subscribeStatus = 200;
  funded = true;
});

const post = (url: string, cookie: string, payload: object = {}) =>
  ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
const signup = (cookie: string, extra: object = {}) =>
  post(`${PATH}/connect`, cookie, { code: 'code-1', wabaId: '777', coexistence: false, ...extra });

describe('whatsapp embedded signup', () => {
  it('is off without the Meta settings', async () => {
    const cookie = await signUpVerified(off);
    await createTenant(off, cookie);
    const status = await off.app.inject({ method: 'GET', url: PATH, headers: { cookie } });
    expect(status.json()).toEqual({ available: false, channel: null });
    const connect = await off.app.inject({
      method: 'POST',
      url: `${PATH}/connect`,
      headers: { cookie },
      payload: { code: 'x', wabaId: '1', coexistence: false },
    });
    expect(connect.statusCode).toBe(503);
  });

  it('is the owner only, and Graph ids must be digits', async () => {
    const professional = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.professional,
    });
    expect((await signup(professional)).statusCode).toBe(403);
    expect((await signup(owner, { wabaId: '../me' })).statusCode).toBe(400);
  });

  it('connects: token stored encrypted, app subscribed, number registered, templates created', async () => {
    const response = await signup(owner, { phoneNumberId });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      channel: { status: 'connected', ready: true, paymentMethod: true, error: null },
    });
    expect(calls.some((call) => call.url.includes(`${phoneNumberId}/register`))).toBe(true);
    expect(
      calls.filter((call) => call.method === POST && call.url.endsWith('/message_templates')),
    ).toHaveLength(2);
    expect(calls.filter((call) => call.auth).every((call) => call.auth === BEARER)).toBe(true);
    const channel = await ctx.db.withTenant(tenantId, (tx) =>
      tx.channel.findFirstOrThrow({ where: { phoneNumberId } }),
    );
    expect(channel.accessTokenEnc).not.toContain(TOKEN);
    const route = await ctx.db.client.channelRoute.findUnique({
      where: { accountId: phoneNumberId },
    });
    expect(route).toMatchObject({ tenantId, channelId: channel.id });
    const view = await ctx.app.inject({ method: 'GET', url: PATH, headers: { cookie: owner } });
    expect(view.json()).toMatchObject({ available: true, appId: '1234', configId: '5678' });
    expect(view.body).not.toContain(TOKEN);
  });

  it('refuses a number another clinic already connected', async () => {
    const other = await signUpVerified(ctx);
    await createTenant(ctx, other);
    expect((await signup(other, { phoneNumberId })).statusCode).toBe(409);
  });

  it('without a card at Meta the number waits; the retry checks again', async () => {
    phoneNumberId = digits();
    funded = false;
    const waiting = await signup(owner, { wabaId: '999' });
    expect(waiting.json()).toMatchObject({
      channel: { status: 'pending', ready: false, paymentMethod: false, error: null },
    });
    funded = true;
    const retried = await post(`${PATH}/retry`, owner);
    expect(retried.json()).toMatchObject({ channel: { status: 'connected', paymentMethod: true } });
  });

  it('coexistence: no registration; a failure is friendly and the retry resumes', async () => {
    phoneNumberId = digits();
    subscribeStatus = 400;
    const failed = await signup(owner, { coexistence: true, wabaId: '888' });
    expect(failed.json()).toMatchObject({ channel: { status: 'pending', ready: false } });
    expect(
      failed.json<{ channel: { error: { message: string } } }>().channel.error.message,
    ).toMatch(/pagamento/);
    subscribeStatus = 200;
    calls.length = 0;
    const retried = await post(`${PATH}/retry`, owner);
    expect(retried.json()).toMatchObject({ channel: { status: 'connected', coexistence: true } });
    expect(calls.some((call) => call.url.includes('/oauth/'))).toBe(false);
    expect(calls.some((call) => call.url.includes('/register'))).toBe(false);
  });
});
