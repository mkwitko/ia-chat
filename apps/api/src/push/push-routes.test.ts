import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';

// E-16: the browser registers for Web Push; subscriptions are per tenant and user.

let ctx: TestContext;
let cookieA: string;
let tenantA: string;
let cookieB: string;
let tenantB: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { env: { PUSH_VAPID_PUBLIC_KEY: 'chave-publica-teste' } });
  cookieA = await signUpVerified(ctx);
  tenantA = await createTenant(ctx, cookieA);
  cookieB = await signUpVerified(ctx);
  tenantB = await createTenant(ctx, cookieB);
});
afterAll(() => ctx.app.close());

const subscription = (endpoint: string) => ({
  endpoint,
  keys: { p256dh: 'chave-p256dh', auth: 'chave-auth' },
});
const call = (method: 'PUT' | 'DELETE', cookie: string, payload: object) =>
  ctx.app.inject({ method, url: '/api/push/subscriptions', payload, headers: { cookie } });

describe('push subscriptions', () => {
  it('hands the public key to the panel', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/push/config',
      headers: { cookie: cookieA },
    });
    expect(response.json()).toEqual({ publicKey: 'chave-publica-teste' });
  });

  it('stores one row per endpoint (idempotent) and removes it on unsubscribe', async () => {
    const endpoint = 'https://push.example.test/a1';
    expect((await call('PUT', cookieA, subscription(endpoint))).statusCode).toBe(200);
    await call('PUT', cookieA, subscription(endpoint));
    const rows = () => ctx.db.withTenant(tenantA, (tx) => tx.pushSubscription.findMany());
    expect(await rows()).toHaveLength(1);
    await call('DELETE', cookieA, { endpoint });
    expect(await rows()).toHaveLength(0);
  });

  it('never touches another tenant subscription', async () => {
    const endpoint = 'https://push.example.test/b1';
    await call('PUT', cookieB, subscription(endpoint));
    await call('DELETE', cookieA, { endpoint });
    const rows = await ctx.db.withTenant(tenantB, (tx) => tx.pushSubscription.findMany());
    expect(rows.map((row) => row.endpoint)).toEqual([endpoint]);
  });

  it('refuses a malformed subscription and an anonymous caller', async () => {
    expect((await call('PUT', cookieA, { endpoint: 'nao-e-url' })).statusCode).toBe(400);
    expect((await call('PUT', '', subscription('https://push.example.test/x'))).statusCode).toBe(
      401,
    );
  });
});
