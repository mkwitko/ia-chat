// Development only: one full billing cycle against the Asaas SANDBOX with fictitious data
// (customer, subscription, simulated payment, overage charge, plan change, cancellation), applying
// each step to a throw-away tenant the same way the webhook and the daily job do.
//   node --env-file=.env apps/api/scripts/billing-sandbox.ts
// Needs ASAAS_API_KEY (a sandbox key) and DATABASE_URL. Never real data; sandbox calls are free.
import { randomInt, randomUUID } from 'node:crypto';
import {
  AsaasClient,
  billingEnvSchema,
  dateKey,
  MS_PER_DAY,
  PLANS,
  PlanId,
  PaymentState,
} from '@app/core';
import { parseEnvWith } from '@app/core';
import { applyPayment, createDb } from '@app/db';

const CPF_BASE_LENGTH = 9;
const CPF_MOD = 11;
const DECIMAL = 10;
const NO_DETAIL = '';
const CLINIC = 'Clínica Fictícia (teste sandbox)';
const SANDBOX_HOST = 'sandbox';
const USER_AGENT = 'consultorio-aberto';
const OVERAGE_CENTS = 2000;

const env = parseEnvWith(billingEnvSchema, process.env);
if (!env.ASAAS_API_KEY) throw new Error('Set ASAAS_API_KEY (sandbox).');
if (!env.ASAAS_BASE_URL.includes(SANDBOX_HOST))
  throw new Error('Refusing to run outside the sandbox.');
const { ASAAS_API_KEY: apiKey, ASAAS_BASE_URL: baseUrl } = env;
const provider = new AsaasClient({ apiKey, baseUrl });
const db = createDb(process.env.DATABASE_URL ?? '');

function freshCpf(): string {
  const digits = Array.from({ length: CPF_BASE_LENGTH }, () => randomInt(DECIMAL));
  const check = (list: number[]) => {
    const sum = list.reduce((acc, d, i) => acc + d * (list.length + 1 - i), 0);
    const rest = (sum * DECIMAL) % CPF_MOD;
    return rest === DECIMAL ? 0 : rest;
  };
  const first = check(digits);
  return [...digits, first, check([...digits, first])].join('');
}

/** Calls the sandbox directly for what the BillingProvider interface does not cover. */
async function raw(method: string, path: string): Promise<unknown> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { access_token: apiKey, 'user-agent': USER_AGENT },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(`${method} ${path} -> ${String(response.status)} ${JSON.stringify(body)}`);
  return body;
}

const step = (name: string, detail: unknown = NO_DETAIL) => {
  console.log(`- ${name}`, detail === NO_DETAIL ? '' : JSON.stringify(detail));
};

const tenant = await db.client.tenant.create({
  data: {
    name: CLINIC,
    slug: `sandbox-${randomUUID()}`,
    document: freshCpf(),
  },
});
const state = async () => {
  const row = await db.client.tenant.findUniqueOrThrow({ where: { id: tenant.id } });
  return {
    status: row.status,
    plan: row.plan,
    overdueSince: row.billingOverdueSince,
    paidDue: row.billingPaidDueDate,
  };
};

try {
  const customer = await provider.createCustomer({
    tenantId: tenant.id,
    name: CLINIC,
    email: `sandbox-${randomUUID()}@exemplo.test`,
    document: tenant.document ?? '',
  });
  step('customer created', customer);

  const due = dateKey(new Date(Date.now() + MS_PER_DAY));
  const subscription = await provider.createSubscription({
    customerId: customer.id,
    cents: PLANS[PlanId.essencial].monthlyCents,
    firstDueDate: due,
    description: 'Assinatura Consultório Aberto (sandbox)',
    tenantId: tenant.id,
  });
  step('subscription created', subscription);
  await db.client.tenant.update({
    where: { id: tenant.id },
    data: { billingCustomerId: customer.id, billingSubscriptionId: subscription.id },
  });

  const [invoice] = await provider.listPayments(subscription.id);
  if (!invoice) throw new Error('the subscription generated no invoice');
  step('first invoice', {
    id: invoice.id,
    state: invoice.state,
    cents: invoice.cents,
    dueDate: invoice.dueDate,
  });

  await applyPayment(db.client, invoice);
  step('tenant after pending invoice', await state());

  await raw('POST', `/sandbox/payment/${invoice.id}/confirm`);
  const [paid] = await provider.listPayments(subscription.id);
  step('invoice after sandbox confirm', { state: paid?.state, expected: PaymentState.paid });
  if (paid) await applyPayment(db.client, paid);
  step('tenant after payment (trial -> active expected only if it was in trial)', await state());

  const charge = await provider.createCharge({
    customerId: customer.id,
    cents: OVERAGE_CENTS,
    dueDate: subscription.nextDueDate ?? due,
    description: 'Excedente de conversas (sandbox)',
    reference: `overage:${tenant.id}:sandbox`,
  });
  step('overage charge created', charge);

  await provider.updateSubscriptionValue(subscription.id, PLANS[PlanId.pro].monthlyCents);
  step('plan change (value updated)', await provider.getSubscription(subscription.id));

  await provider.cancelSubscription(subscription.id);
  step(
    'subscription cancelled',
    await provider.getSubscription(subscription.id).catch((e: unknown) => String(e)),
  );
  await raw('DELETE', `/customers/${customer.id}`).catch(() => undefined);
} finally {
  await db.client.tenant.delete({ where: { id: tenant.id } });
  await db.client.$disconnect();
}
