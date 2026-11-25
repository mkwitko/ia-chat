import { randomUUID } from 'node:crypto';
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

const NOT_FOUND = 404;
const ONE = 1;
const SALT_LENGTH = 8;

interface FakeSubscription extends ProviderSubscription {
  customerId: string;
  cents: number;
}

/** In-memory provider for tests: no network. Tests move payments with `setState`. */
export class FakeBilling implements BillingProvider {
  readonly customers = new Map<string, NewCustomer>();
  readonly subscriptions = new Map<string, FakeSubscription>();
  readonly payments = new Map<string, ProviderPayment>();
  readonly charges: NewCharge[] = [];
  private counter = 0;
  /** Ids are unique per instance: the dev database outlives test runs and ids are unique there. */
  private readonly salt = randomUUID().slice(0, SALT_LENGTH);

  private nextId(prefix: string): string {
    this.counter += ONE;
    return `${prefix}_${this.salt}_${String(this.counter)}`;
  }

  createCustomer(input: NewCustomer) {
    const id = this.nextId('cus');
    this.customers.set(id, input);
    return Promise.resolve({ id });
  }

  createSubscription(input: NewSubscription) {
    const id = this.nextId('sub');
    const subscription = {
      id,
      active: true,
      nextDueDate: input.firstDueDate,
      customerId: input.customerId,
      cents: input.cents,
    };
    this.subscriptions.set(id, subscription);
    const paymentId = this.nextId('pay');
    this.payments.set(paymentId, {
      id: paymentId,
      customerId: input.customerId,
      subscriptionId: id,
      state: PaymentState.pending,
      dueDate: input.firstDueDate,
      cents: input.cents,
      invoiceUrl: `https://fake.test/i/${paymentId}`,
    });
    return Promise.resolve(subscription);
  }

  private subscription(id: string): FakeSubscription {
    const found = this.subscriptions.get(id);
    if (!found) throw new BillingError('subscription not found', NOT_FOUND);
    return found;
  }

  updateSubscriptionValue(id: string, cents: number) {
    this.subscription(id).cents = cents;
    return Promise.resolve();
  }

  cancelSubscription(id: string) {
    this.subscription(id).active = false;
    return Promise.resolve();
  }

  getSubscription(id: string) {
    return Promise.resolve(this.subscription(id));
  }

  listPayments(subscriptionId: string) {
    const own = [...this.payments.values()].filter((p) => p.subscriptionId === subscriptionId);
    return Promise.resolve(own);
  }

  createCharge(input: NewCharge) {
    this.charges.push(input);
    return Promise.resolve({ id: this.nextId('chg') });
  }

  /** Test control: the state of the subscription's payment `index` (0 = first). */
  setState(subscriptionId: string, state: PaymentState, index = 0): ProviderPayment {
    const payment = [...this.payments.values()].filter((p) => p.subscriptionId === subscriptionId)[
      index
    ];
    if (!payment) throw new BillingError('payment not found', NOT_FOUND);
    const updated = { ...payment, state };
    this.payments.set(payment.id, updated);
    return updated;
  }
}
