import { randomInt } from 'node:crypto';
import { FakeBilling } from '@app/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';

// E-25: subscribe, change plan, cancel, and the Asaas webhook (idempotent, token-checked).

const TOKEN = 'token-de-teste-do-webhook-asaas-123456';
const CPF_BASE_LENGTH = 9;
const CPF_MOD = 11;

/** A valid CPF no other test has used (the document is unique, and the dev database is shared). */
function freshCpf(): string {
  const digits = Array.from({ length: CPF_BASE_LENGTH }, () => randomInt(10));
  const check = (list: number[]) => {
    const sum = list.reduce((acc, d, i) => acc + d * (list.length + 1 - i), 0);
    const rest = (sum * 10) % CPF_MOD;
    return rest === 10 ? 0 : rest;
  };
  const first = check(digits);
  return [...digits, first, check([...digits, first])].join('');
}
const CPF = freshCpf();

const fake = new FakeBilling();
let ctx: TestContext;
let off: TestContext;
let cookie: string;
let tenantId: string;
let eventSeq = 0;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { billing: fake, env: { ASAAS_WEBHOOK_TOKEN: TOKEN } });
  off = await startTestApp();
  cookie = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, cookie);
});
afterAll(async () => {
  await ctx.app.close();
  await off.app.close();
});

const call = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
  ctx.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

const row = () => ctx.db.client.tenant.findUniqueOrThrow({ where: { id: tenantId } });

async function webhook(
  event: string,
  payment: object,
  options: { id?: string; token?: string } = {},
) {
  eventSeq += 1;
  return ctx.app.inject({
    method: 'POST',
    url: '/webhooks/asaas',
    headers: { 'asaas-access-token': options.token ?? TOKEN },
    payload: {
      id: options.id ?? `evt_${tenantId}_${String(eventSeq)}`,
      event,
      payment,
    },
  });
}

const invoice = (status: string, dueDate = '2027-03-01') => ({
  id: 'pay_1',
  customer: 'cus_1',
  subscription: sub(),
  status,
  dueDate,
  value: 197,
  invoiceUrl: 'https://fake.test/i/pay_1',
});
let subscriptionId = '';
const sub = () => subscriptionId;

describe('billing off', () => {
  it('answers 503 on writes and reports enabled=false', async () => {
    const cookieOff = await signUpVerified(off);
    await createTenant(off, cookieOff);
    const view = await off.app.inject({
      method: 'GET',
      url: '/api/billing',
      headers: { cookie: cookieOff },
    });
    expect(view.json()).toMatchObject({ enabled: false, subscribed: false });
    const post = await off.app.inject({
      method: 'POST',
      url: '/api/billing/subscription',
      headers: { cookie: cookieOff },
      payload: { plan: 'agenda' },
    });
    expect(post.statusCode).toBe(503);
  });
});

describe('subscription', () => {
  it('needs the CPF/CNPJ first', async () => {
    expect((await call('POST', '/api/billing/subscription', { plan: 'agenda' })).statusCode).toBe(
      400,
    );
    expect((await call('PUT', '/api/trial/document', { document: CPF })).statusCode).toBe(200);
  });

  it('subscribes during the trial and keeps the trial until the first payment', async () => {
    const response = await call('POST', '/api/billing/subscription', { plan: 'agenda' });
    expect(response.statusCode).toBe(201);
    const tenant = await row();
    subscriptionId = tenant.billingSubscriptionId ?? '';
    expect(tenant).toMatchObject({ plan: 'agenda', status: 'trial' });
    expect(fake.subscriptions.get(subscriptionId)?.cents).toBe(29_700);
    const view = (await call('GET', '/api/billing')).json<{ invoiceUrl: string }>();
    expect(view).toMatchObject({ enabled: true, subscribed: true, plan: 'agenda' });
    expect(view.invoiceUrl).toContain('fake.test');
    expect((await call('POST', '/api/billing/subscription', { plan: 'pro' })).statusCode).toBe(409);
  });

  it('refuses the webhook without the token', async () => {
    expect(
      (await webhook('PAYMENT_RECEIVED', invoice('RECEIVED'), { token: 'x' })).statusCode,
    ).toBe(401);
  });

  it('activates on payment, once per event id', async () => {
    const id = `evt_paid_${tenantId}`;
    expect((await webhook('PAYMENT_RECEIVED', invoice('RECEIVED'), { id })).statusCode).toBe(200);
    expect(await row()).toMatchObject({ status: 'active', billingInvoiceUrl: null });
    await ctx.db.client.tenant.update({ where: { id: tenantId }, data: { status: 'trial' } });
    await webhook('PAYMENT_RECEIVED', invoice('RECEIVED'), { id });
    expect((await row()).status).toBe('trial');
    await webhook('PAYMENT_CONFIRMED', invoice('CONFIRMED'));
    expect((await row()).status).toBe('active');
  });

  it('marks the oldest unpaid invoice as overdue and ignores late news about paid ones', async () => {
    await webhook('PAYMENT_OVERDUE', invoice('OVERDUE', '2027-04-01'));
    expect((await row()).billingOverdueSince?.toISOString()).toBe('2027-04-01T00:00:00.000Z');
    await webhook('PAYMENT_OVERDUE', invoice('OVERDUE', '2027-03-01'));
    expect((await row()).billingOverdueSince?.toISOString()).toBe('2027-04-01T00:00:00.000Z');
    await webhook('PAYMENT_RECEIVED', invoice('RECEIVED', '2027-04-01'));
    expect((await row()).billingOverdueSince).toBeNull();
  });

  it('changes plan at the provider and here, then cancels', async () => {
    expect((await call('PUT', '/api/billing/plan', { plan: 'pro' })).statusCode).toBe(200);
    expect(fake.subscriptions.get(subscriptionId)?.cents).toBe(49_700);
    expect((await row()).plan).toBe('pro');
    expect((await call('DELETE', '/api/billing/subscription')).statusCode).toBe(200);
    expect(fake.subscriptions.get(subscriptionId)?.active).toBe(false);
    expect(await row()).toMatchObject({ status: 'cancelled', billingSubscriptionId: null });
    expect((await call('PUT', '/api/billing/plan', { plan: 'agenda' })).statusCode).toBe(409);
  });
});
