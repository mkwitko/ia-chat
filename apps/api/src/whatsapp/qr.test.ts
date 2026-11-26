import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { WAHA_BASE_URL } from '@app/channels/waha-fixtures';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// E-09b: "Conectar por QR code" (RF-27, RF-29). WAHA is a fake `fetch`: no container, no phone.

const PATH = '/api/whatsapp/qr';
const POST = 'POST';
const API_KEY = 'chave-de-teste';
const GET = 'GET';
const QR = { mimetype: 'image/png', data: 'iVBORw0KGgo=' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let sessionStatus = 'SCAN_QR_CODE';
let created = false;
const calls: { method: string; url: string; key: string | null }[] = [];
const fakeWaha: typeof fetch = (url, init) => {
  const target = url instanceof Request ? url.url : url.toString();
  calls.push({
    method: init?.method ?? GET,
    url: target,
    key: new Headers(init?.headers).get('x-api-key'),
  });
  if (target.endsWith('/auth/qr')) return Promise.resolve(json(QR));
  if (target.endsWith('/api/sessions') && init?.method === POST) {
    const status = created ? 422 : 201;
    created = true;
    return Promise.resolve(json({ status: 'STARTING' }, status));
  }
  if (init?.method === POST) return Promise.resolve(json({}));
  return Promise.resolve(json({ status: sessionStatus, me: { id: '5541999990009@c.us' } }));
};

let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, {
    waha: { baseUrl: WAHA_BASE_URL, apiKey: API_KEY, fetch: fakeWaha },
  });
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());
beforeEach(() => {
  calls.length = 0;
  sessionStatus = 'SCAN_QR_CODE';
});

const get = (cookie: string) => ctx.app.inject({ method: GET, url: PATH, headers: { cookie } });
const post = (cookie: string, path: string, payload: object = {}) =>
  ctx.app.inject({ method: 'POST', url: `${PATH}${path}`, headers: { cookie }, payload });
const accept = { accepted: true, version: '1.0' };

describe('WhatsApp by QR code', () => {
  it('starts with no channel and refuses to connect without the accepted term', async () => {
    expect((await get(owner)).json()).toEqual({
      available: true,
      termsVersion: '1.0',
      channel: null,
    });
    expect((await post(owner, '/connect', { accepted: false, version: '1.0' })).statusCode).toBe(
      400,
    );
    expect((await post(owner, '/connect', { accepted: true, version: '0.9' })).statusCode).toBe(
      400,
    );
    expect(calls).toHaveLength(0);
  });

  it('is the owner only', async () => {
    const professional = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.professional,
    });
    expect((await post(professional, '/connect', accept)).statusCode).toBe(403);
  });

  it('records the accept in the audit log, routes the session and shows the QR code', async () => {
    const response = await post(owner, '/connect', accept);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      channel: { status: 'pending', session: { state: 'qr', qr: QR } },
    });
    expect(calls.every((call) => call.key === API_KEY)).toBe(true);
    const { channel, accepted } = await ctx.db.withTenant(tenantId, async (tx) => ({
      channel: await tx.channel.findFirstOrThrow({ where: { kind: 'qr_gateway' } }),
      accepted: await tx.auditLog.findFirst({ where: { entity: 'whatsapp_qr_terms' } }),
    }));
    expect(accepted).toMatchObject({ action: 'accept', after: { version: '1.0' } });
    expect(accepted?.actorId).toBeTruthy();
    const route = await ctx.db.client.channelRoute.findUnique({
      where: { accountId: channel.gatewaySession ?? '' },
    });
    expect(route?.tenantId).toBe(tenantId);
  });

  it('becomes connected with the paired number once WAHA says WORKING', async () => {
    sessionStatus = 'WORKING';
    expect((await get(owner)).json()).toMatchObject({
      channel: { status: 'connected', displayPhone: '+5541999990009', session: null },
    });
  });

  it('a new QR code restarts the existing session', async () => {
    const response = await post(owner, '/restart');
    expect(response.statusCode).toBe(200);
    expect(calls.some((call) => call.url.endsWith('/restart'))).toBe(true);
  });
});
