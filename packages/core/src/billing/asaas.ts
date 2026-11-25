import type * as z from 'zod';
import {
  customerSchema,
  paymentListSchema,
  paymentSchema,
  subscriptionSchema,
  type AsaasPayment,
} from './asaas-types.ts';
import {
  BillingError,
  PaymentState,
  type BillingProvider,
  type NewCharge,
  type NewCustomer,
  type NewSubscription,
  type ProviderPayment,
  type ProviderSubscription,
} from './provider.ts';

export interface AsaasConfig {
  apiKey: string;
  baseUrl: string;
  /** Test seam. */
  fetch?: typeof fetch;
}

interface ApiRequest {
  method: string;
  path: string;
  body?: object;
}

const CENTS = 100;
const USER_AGENT = 'consultorio-aberto';
const PAID = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']);
const PENDING = new Set(['PENDING', 'AWAITING_RISK_ANALYSIS']);
const OVERDUE = 'OVERDUE';
const DEAD_SUBSCRIPTION = new Set(['INACTIVE', 'EXPIRED']);
const CYCLE_MONTHLY = 'MONTHLY';
/** The customer picks Pix, boleto or card on the invoice page. */
const BILLING_TYPE = 'UNDEFINED';
const LIST_LIMIT = 100;
const Method = { get: 'GET', post: 'POST', put: 'PUT', delete: 'DELETE' } as const;

const toReais = (cents: number) => cents / CENTS;
const toCents = (reais: number) => Math.round(reais * CENTS);

export function paymentState(status: string): PaymentState {
  if (PAID.has(status)) return PaymentState.paid;
  if (status === OVERDUE) return PaymentState.overdue;
  return PENDING.has(status) ? PaymentState.pending : PaymentState.other;
}

export function toProviderPayment(payment: AsaasPayment): ProviderPayment {
  return {
    id: payment.id,
    customerId: payment.customer,
    subscriptionId: payment.subscription ?? null,
    state: paymentState(payment.status),
    dueDate: payment.dueDate,
    cents: toCents(payment.value),
    invoiceUrl: payment.invoiceUrl ?? null,
  };
}

const toSubscription = (raw: z.infer<typeof subscriptionSchema>): ProviderSubscription => ({
  id: raw.id,
  active: raw.deleted !== true && !DEAD_SUBSCRIPTION.has(raw.status ?? ''),
  nextDueDate: raw.nextDueDate ?? null,
});

/** Our own Asaas client (no SDK): customers, subscriptions and payments. */
export class AsaasClient implements BillingProvider {
  private readonly config: AsaasConfig;
  constructor(config: AsaasConfig) {
    this.config = config;
  }

  private async call<T>(request: ApiRequest, schema: z.ZodType<T>): Promise<T> {
    const { method, path, body } = request;
    const send = this.config.fetch ?? fetch;
    const response = await send(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        access_token: this.config.apiKey,
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new BillingError(`asaas ${method} ${path}`, response.status);
    return schema.parse(await response.json());
  }

  createCustomer(input: NewCustomer) {
    const body = {
      name: input.name,
      email: input.email,
      cpfCnpj: input.document,
      externalReference: input.tenantId,
    };
    return this.call({ method: Method.post, path: '/customers', body }, customerSchema);
  }

  async createSubscription(input: NewSubscription) {
    const body = {
      customer: input.customerId,
      billingType: BILLING_TYPE,
      value: toReais(input.cents),
      nextDueDate: input.firstDueDate,
      cycle: CYCLE_MONTHLY,
      description: input.description,
      externalReference: input.tenantId,
    };
    const request = { method: Method.post, path: '/subscriptions', body };
    return toSubscription(await this.call(request, subscriptionSchema));
  }

  async updateSubscriptionValue(subscriptionId: string, cents: number) {
    const body = { value: toReais(cents), updatePendingPayments: true };
    const path = `/subscriptions/${subscriptionId}`;
    await this.call({ method: Method.put, path, body }, subscriptionSchema);
  }

  async cancelSubscription(subscriptionId: string) {
    const path = `/subscriptions/${subscriptionId}`;
    await this.call({ method: Method.delete, path }, subscriptionSchema.partial());
  }

  async getSubscription(subscriptionId: string) {
    const path = `/subscriptions/${subscriptionId}`;
    return toSubscription(await this.call({ method: Method.get, path }, subscriptionSchema));
  }

  async listPayments(subscriptionId: string) {
    const path = `/subscriptions/${subscriptionId}/payments?limit=${String(LIST_LIMIT)}`;
    const list = await this.call({ method: Method.get, path }, paymentListSchema);
    return list.data.map(toProviderPayment);
  }

  createCharge(input: NewCharge) {
    const body = {
      customer: input.customerId,
      billingType: BILLING_TYPE,
      value: toReais(input.cents),
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.reference,
    };
    const request = { method: Method.post, path: '/payments', body };
    return this.call(request, paymentSchema.pick({ id: true }));
  }
}
