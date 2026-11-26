import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { InboundProvider } from '@app/channels';
import { SESSION, wahaOwnerEcho, wahaText } from '@app/channels/waha-fixtures';
import { startTestApp, type TestContext } from '../test-support.ts';
import { WAHA_WEBHOOK_PATH } from './waha.ts';

// E-09b: the QR code gateway's webhook. HMAC-SHA512 from WAHA, raw stored, routed by session.

const SECRET = 'hmac-de-teste-do-waha';
const queued: string[] = [];
let ctx: TestContext;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, {
    env: { WAHA_WEBHOOK_SECRET: SECRET },
    enqueueInbound: (_tenant, id) => {
      queued.push(id);
      return Promise.resolve();
    },
  });
  const tenant = await ctx.db.client.tenant.create({
    data: { name: 'WAHA (fictício)', slug: `waha-${randomUUID()}` },
  });
  tenantId = tenant.id;
  const channel = await ctx.db.withTenant(tenantId, (tx) =>
    tx.channel.create({ data: { tenantId, kind: 'qr_gateway', gatewaySession: SESSION } }),
  );
  await ctx.db.client.channelRoute.deleteMany({ where: { accountId: SESSION } });
  await ctx.db.client.channelRoute.create({
    data: { accountId: SESSION, tenantId, channelId: channel.id },
  });
});
afterAll(() => ctx.app.close());
beforeEach(() => {
  queued.length = 0;
});

const asBody = (payload: object) => Buffer.from(JSON.stringify(payload));
const sign = (body: Buffer) => createHmac('sha512', SECRET).update(body).digest('hex');
const post = (body: Buffer, hmac = sign(body)) =>
  ctx.app.inject({
    method: 'POST',
    url: WAHA_WEBHOOK_PATH,
    payload: body,
    headers: { 'content-type': 'application/json', 'x-webhook-hmac': hmac },
  });

describe('WAHA webhook', () => {
  it('stores a signed event for the session tenant and queues it', async () => {
    const response = await post(asBody(wahaText));
    expect(response.statusCode).toBe(200);
    const stored = await ctx.db.withTenant(tenantId, (tx) =>
      tx.inboundEvent.findMany({ where: { provider: InboundProvider.waha } }),
    );
    expect(stored.length).toBeGreaterThan(0);
    expect(queued).toHaveLength(1);
  });

  it('rejects a missing or wrong HMAC without storing', async () => {
    const body = asBody(wahaOwnerEcho);
    expect((await post(body, sign(asBody({ other: true })))).statusCode).toBe(401);
    expect((await post(body, '')).statusCode).toBe(401);
    expect(queued).toHaveLength(0);
  });

  it('answers 200 to an unknown session and to an unreadable signed body', async () => {
    const unknown = asBody({ ...wahaText, session: 'qr-desconhecida' });
    expect((await post(unknown)).statusCode).toBe(200);
    expect((await post(asBody({ nope: 1 }))).statusCode).toBe(200);
    expect(queued).toHaveLength(0);
  });
});
