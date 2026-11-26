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
import { HISTORY_WINDOW_MS } from './history-import.ts';

// E-24b: authorization of the coexistence history import. The Graph API is a fake `fetch`.

const PATH = '/api/whatsapp';
const IMPORT = `${PATH}/history-import`;
const ENV = {
  META_APP_ID: '1234',
  META_APP_SECRET: 'app-secret',
  META_ES_CONFIG_ID: '5678',
  META_TOKEN_KEY: randomBytes(32).toString('base64'),
};
const digits = () => String(randomInt(1e9, 9e9));

const syncs: string[] = [];
let failSync: string | null = null;
let phoneNumberId = digits();

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
// The fake receives JSON text as the body.
// eslint-disable-next-line @typescript-eslint/no-base-to-string
const bodyText = (init?: RequestInit) => String(init?.body);
const fakeGraph: typeof fetch = (url, init) => {
  const target = url instanceof Request ? url.url : url.toString();
  if (target.includes('/oauth/access_token')) return Promise.resolve(json({ access_token: 't' }));
  if (target.includes('/phone_numbers'))
    return Promise.resolve(json({ data: [{ id: phoneNumberId }] }));
  if (target.endsWith('/smb_app_data')) {
    const body = JSON.parse(bodyText(init)) as { sync_type: string };
    if (body.sync_type === failSync) return Promise.resolve(json({ error: { code: 1 } }, 400));
    syncs.push(body.sync_type);
  }
  if (target.includes('?fields=primary_funding_id'))
    return Promise.resolve(json({ primary_funding_id: '9' }));
  if (target.includes('/message_templates?')) return Promise.resolve(json({ data: [] }));
  return Promise.resolve(json({ success: true }));
};

let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { metaFetch: fakeGraph, env: ENV });
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());
beforeEach(() => {
  syncs.length = 0;
  failSync = null;
  phoneNumberId = digits();
});

const post = (url: string, cookie: string, payload: object) =>
  ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
const connect = (coexistence: boolean) =>
  post(`${PATH}/connect`, owner, { code: 'c', wabaId: '777', phoneNumberId, coexistence });
const decide = (authorize: boolean, cookie = owner) => post(IMPORT, cookie, { authorize });
const history = async () =>
  (await ctx.app.inject({ method: 'GET', url: PATH, headers: { cookie: owner } })).json<{
    channel: { history: { state: string; expiresAt: string | null } };
  }>().channel.history;

describe('history import authorization', () => {
  it('offers the import only to coexistence numbers, for 24 hours', async () => {
    await connect(false);
    expect((await history()).state).toBe('none');
    await connect(true);
    const offer = await history();
    expect(offer.state).toBe('offered');
    expect(Date.parse(offer.expiresAt ?? '') - Date.now()).toBeLessThanOrEqual(HISTORY_WINDOW_MS);
  });

  it('asks Meta for the contacts, then the history, only after the owner authorizes', async () => {
    await connect(true);
    expect(syncs).toEqual([]);
    const response = await decide(true);
    expect(response.statusCode).toBe(200);
    expect(syncs).toEqual(['smb_app_state_sync', 'history']);
    expect((await history()).state).toBe('requested');
    const channel = await ctx.db.withTenant(tenantId, (tx) =>
      tx.channel.findFirstOrThrow({ where: { phoneNumberId } }),
    );
    expect(channel.historyAuthorizedAt).not.toBeNull();
    expect((await decide(true)).statusCode).toBe(409);
  });

  it('records a refusal and never calls Meta', async () => {
    await connect(true);
    expect((await decide(false)).statusCode).toBe(200);
    expect(syncs).toEqual([]);
    expect((await history()).state).toBe('declined');
    expect((await decide(true)).statusCode).toBe(409);
  });

  it('resumes after the second request failed, without repeating the first', async () => {
    await connect(true);
    failSync = 'history';
    expect((await decide(true)).statusCode).toBe(502);
    expect(syncs).toEqual(['smb_app_state_sync']);
    expect((await history()).state).toBe('offered');
    failSync = null;
    expect((await decide(true)).statusCode).toBe(200);
    expect(syncs).toEqual(['smb_app_state_sync', 'history']);
  });

  it('closes the offer after the 24 hour window', async () => {
    await connect(true);
    await ctx.db.withTenant(tenantId, (tx) =>
      tx.channel.updateMany({
        where: { phoneNumberId },
        data: { onboardedAt: new Date(Date.now() - HISTORY_WINDOW_MS - 1000) },
      }),
    );
    expect((await history()).state).toBe('expired');
    expect((await decide(true)).statusCode).toBe(409);
    expect(syncs).toEqual([]);
  });

  it('is the owner only', async () => {
    await connect(true);
    const professional = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.professional,
    });
    expect((await decide(true, professional)).statusCode).toBe(403);
    expect(
      (
        await ctx.app.inject({
          method: 'POST',
          url: IMPORT,
          headers: { cookie: owner },
          payload: { authorize: 'yes' },
        })
      ).statusCode,
    ).toBe(400);
  });
});
