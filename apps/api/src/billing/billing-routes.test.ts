import { FakeBilling } from '@app/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTenant,
  freshCpf,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// E-25: subscribe, change plan, cancel, and the Asaas webhook (idempotent, token-checked).

const TOKEN = 'token-de-teste-do-webhook-asaas-123456';
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
  // H-24: the trial clock starts when the WhatsApp connects.
  await ctx.db.withTenant(tenantId, (tx) =>
    tx.channel.create({ data: { tenantId, kind: 'cloud_api', status: 'connected' } }),
  );
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
    expect(
      (await call('POST', '/api/billing/subscription', { plan: 'essencial' })).statusCode,
    ).toBe(409);
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

  it('changes plan, then cancels and keeps working until the paid month ends', async () => {
    expect((await call('PUT', '/api/billing/plan', { plan: 'pro' })).statusCode).toBe(400);
    expect((await call('PUT', '/api/billing/plan', { plan: 'essencial' })).statusCode).toBe(200);
    expect(fake.subscriptions.get(subscriptionId)?.cents).toBe(19_700);
    expect((await row()).plan).toBe('essencial');
    expect((await call('DELETE', '/api/billing/subscription')).statusCode).toBe(200);
    expect(fake.subscriptions.get(subscriptionId)?.active).toBe(false);
    // The last paid invoice fell due on 2027-04-01: paid through 2027-05-01.
    const after = await row();
    expect(after).toMatchObject({ status: 'active', billingSubscriptionId: null });
    expect(after.billingEndsAt?.toISOString()).toBe('2027-05-01T00:00:00.000Z');
    const view = (await call('GET', '/api/billing')).json<{ endsAt: string }>();
    expect(view.endsAt).toBe('2027-05-01T00:00:00.000Z');
    expect((await call('PUT', '/api/billing/plan', { plan: 'agenda' })).statusCode).toBe(409);
  });
});
