import { randomUUID } from 'node:crypto';
import { FakeBilling, PaymentState, type EmailMessage } from '@app/core';
import { createDb } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { isRestricted } from '../conversation/restricted.ts';
import { runBillingDaily } from './daily.ts';

// E-25: daily reconciliation, overdue ladder (notice, notice, restricted) and the overage charge.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-03-15T10:00:00Z');
const DUE = '2027-03-05';
const FEBRUARY = new Date('2027-02-01T00:00:00Z');

async function setup() {
  const fake = new FakeBilling();
  const customer = await fake.createCustomer({
    tenantId: 'x',
    name: 'Teste (fictício)',
    email: 'a@exemplo.test',
    document: '00000000000',
  });
  const subscription = await fake.createSubscription({
    customerId: customer.id,
    cents: 19_700,
    firstDueDate: DUE,
    description: 'x',
    tenantId: 'x',
  });
  const subscriptionId = `${subscription.id}-${randomUUID()}`;
  fake.subscriptions.set(subscriptionId, {
    ...subscription,
    id: subscriptionId,
    customerId: customer.id,
    cents: 19_700,
  });
  for (const [id, payment] of fake.payments) fake.payments.set(id, { ...payment, subscriptionId });
  const tenant = await db.client.tenant.create({
    data: {
      name: 'Teste (fictício)',
      slug: `billing-${randomUUID()}`,
      status: 'active',
      trialEndsAt: null,
      billingCustomerId: `${customer.id}-${randomUUID()}`,
      billingSubscriptionId: subscriptionId,
      billingOverageThrough: new Date('2027-01-01T00:00:00Z'),
    },
  });
  const email = `dono-${randomUUID()}@exemplo.test`;
  const user = await db.client.user.create({ data: { name: 'Dono', email, emailVerified: true } });
  await db.withTenant(tenant.id, (tx) =>
    tx.membership.create({ data: { tenantId: tenant.id, userId: user.id, role: 'owner' } }),
  );
  const sent: EmailMessage[] = [];
  const run = (now = NOW) =>
    runBillingDaily({
      db,
      provider: fake,
      now,
      panelUrl: 'http://app.test',
      alert: () => undefined,
      onlyTenantId: tenant.id,
      email: {
        send: (message) => {
          sent.push(message);
          return Promise.resolve();
        },
      },
    });
  const row = () => db.client.tenant.findUniqueOrThrow({ where: { id: tenant.id } });
  return { fake, subscriptionId, tenant, sent, run, row, email };
}

describe('overdue ladder', () => {
  it('reconciles an overdue invoice, warns once and restricts at 7 days', async () => {
    const { fake, subscriptionId, tenant, sent, run, row } = await setup();
    fake.setState(subscriptionId, PaymentState.overdue);
    const result = await run();
    expect(result).toMatchObject({ reconciled: 1, noticed: 1, restricted: 1 });
    expect(await row()).toMatchObject({ status: 'restricted', billingNoticeStep: 2 });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain('fake.test');
    await run();
    expect(sent).toHaveLength(1);
    expect(await db.withTenant(tenant.id, (tx) => isRestricted(tx, tenant.id))).toBe(true);
  });

  it('warns at day 0 and again at day 3 without restricting', async () => {
    const { fake, subscriptionId, sent, run, row } = await setup();
    fake.setState(subscriptionId, PaymentState.overdue);
    await run(new Date('2027-03-05T12:00:00Z'));
    expect(sent).toHaveLength(1);
    await run(new Date('2027-03-08T12:00:00Z'));
    expect(sent).toHaveLength(2);
    expect(await row()).toMatchObject({ status: 'active' });
  });

  it('comes back to active when the invoice is paid', async () => {
    const { fake, subscriptionId, tenant, run, row } = await setup();
    fake.setState(subscriptionId, PaymentState.overdue);
    await run();
    fake.setState(subscriptionId, PaymentState.paid);
    await run();
    expect(await row()).toMatchObject({ status: 'active', billingOverdueSince: null });
    expect(await db.withTenant(tenant.id, (tx) => isRestricted(tx, tenant.id))).toBe(false);
  });

  it('marks the tenant cancelled when the subscription is gone at the provider', async () => {
    const { fake, subscriptionId, run, row } = await setup();
    await fake.cancelSubscription(subscriptionId);
    await run();
    expect(await row()).toMatchObject({ status: 'cancelled', billingSubscriptionId: null });
  });
});

describe('overage', () => {
  it('charges the closed month once, from our own count', async () => {
    const { fake, tenant, run, row } = await setup();
    await db.withTenant(tenant.id, (tx) =>
      tx.usageCounter.create({
        data: { tenantId: tenant.id, month: FEBRUARY, conversations: 350 },
      }),
    );
    expect(await run()).toMatchObject({ overageCharged: 1 });
    expect(fake.charges).toHaveLength(1);
    expect(fake.charges[0]).toMatchObject({ cents: 2000, dueDate: DUE });
    expect(fake.charges[0]?.description).toContain('fevereiro de 2027');
    await run();
    expect(fake.charges).toHaveLength(1);
    expect((await row()).billingOverageThrough?.toISOString()).toBe('2027-02-01T00:00:00.000Z');
  });

  it('charges nothing inside the franchise', async () => {
    const { fake, run } = await setup();
    await run();
    expect(fake.charges).toHaveLength(0);
  });
});
