// The billing provider behind an interface (spec 05, "Assinatura do SaaS"). Money in integer
// cents, dates as `YYYY-MM-DD`; the Asaas shapes stay inside asaas.ts.

export const PaymentState = {
  pending: 'pending',
  paid: 'paid',
  overdue: 'overdue',
  /** Refunds, chargebacks and the like: no change of the tenant's state. */
  other: 'other',
} as const;
export type PaymentState = (typeof PaymentState)[keyof typeof PaymentState];

export interface ProviderPayment {
  id: string;
  customerId: string;
  /** Null for a one-off charge (the overage). */
  subscriptionId: string | null;
  state: PaymentState;
  dueDate: string;
  cents: number;
  invoiceUrl: string | null;
}

export interface NewCustomer {
  tenantId: string;
  name: string;
  email: string;
  /** CPF or CNPJ, digits only. */
  document: string;
}

export interface NewSubscription {
  customerId: string;
  cents: number;
  firstDueDate: string;
  description: string;
  tenantId: string;
}

export interface NewCharge {
  customerId: string;
  cents: number;
  dueDate: string;
  description: string;
  /** Ties the charge to its tenant and month. */
  reference: string;
}

export interface ProviderSubscription {
  id: string;
  active: boolean;
  nextDueDate: string | null;
}

export interface BillingProvider {
  createCustomer(input: NewCustomer): Promise<{ id: string }>;
  createSubscription(input: NewSubscription): Promise<ProviderSubscription>;
  updateSubscriptionValue(subscriptionId: string, cents: number): Promise<void>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getSubscription(subscriptionId: string): Promise<ProviderSubscription>;
  listPayments(subscriptionId: string): Promise<ProviderPayment[]>;
  createCharge(input: NewCharge): Promise<{ id: string }>;
}

export class BillingError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
