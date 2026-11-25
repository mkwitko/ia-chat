import { fromDateKey, PaymentState, type ProviderPayment } from '@app/core';
import { Autonomy, TenantStatus } from '../../generated/prisma/enums.ts';
import type { Db } from '../index.ts';

type Client = Db['client'];

interface TenantState {
  id: string;
  status: TenantStatus;
  autonomy: Autonomy;
  trialEndedAt: Date | null;
  billingOverdueSince: Date | null;
  billingPaidDueDate: Date | null;
}

const maxDate = (a: Date | null, b: Date): Date => (a && a > b ? a : b);

/**
 * Moves the tenant along with one subscription invoice (E-25). Webhook and reconciliation both
 * call it, so it must be safe to repeat and to receive out of order. Returns true when the tenant
 * was found and the invoice mattered.
 */
export async function applyPayment(client: Client, payment: ProviderPayment): Promise<boolean> {
  if (!payment.subscriptionId || payment.state === PaymentState.other) return false;
  const tenant = await client.tenant.findUnique({
    where: { billingSubscriptionId: payment.subscriptionId },
    select: {
      id: true,
      status: true,
      autonomy: true,
      trialEndedAt: true,
      billingOverdueSince: true,
      billingPaidDueDate: true,
    },
  });
  if (!tenant) return false;
  const due = fromDateKey(payment.dueDate);
  if (payment.state === PaymentState.paid) return applyPaid(client, tenant, due);
  return applyOpen(client, tenant, { payment, due });
}

/** A paid invoice reopens a trial or restricted tenant, unless an older invoice is still open. */
async function applyPaid(client: Client, tenant: TenantState, due: Date): Promise<boolean> {
  const clears = !tenant.billingOverdueSince || due >= tenant.billingOverdueSince;
  const reopen = tenant.status === TenantStatus.trial || tenant.status === TenantStatus.restricted;
  const backOn = reopen && clears;
  const trialEnded = tenant.trialEndedAt !== null && tenant.autonomy === Autonomy.off;
  await client.tenant.update({
    where: { id: tenant.id },
    data: {
      billingPaidDueDate: maxDate(tenant.billingPaidDueDate, due),
      billingInvoiceUrl: null,
      ...(clears ? { billingOverdueSince: null, billingNoticeStep: 0 } : {}),
      ...(backOn ? { status: TenantStatus.active } : {}),
      ...(backOn && trialEnded ? { autonomy: Autonomy.approve } : {}),
    },
  });
  return true;
}

/** A pending or overdue invoice: keeps the pay link and the oldest overdue date. */
async function applyOpen(
  client: Client,
  tenant: TenantState,
  { payment, due }: { payment: ProviderPayment; due: Date },
): Promise<boolean> {
  const alreadyPaid = tenant.billingPaidDueDate !== null && due <= tenant.billingPaidDueDate;
  if (alreadyPaid) return false;
  const since = tenant.billingOverdueSince;
  const older = payment.state === PaymentState.overdue && (!since || due < since);
  await client.tenant.update({
    where: { id: tenant.id },
    data: {
      billingInvoiceUrl: payment.invoiceUrl,
      ...(older ? { billingOverdueSince: due } : {}),
    },
  });
  return true;
}

/** The subscription is gone at the provider (we cancelled it, or support did). */
export async function markSubscriptionCancelled(
  client: Client,
  subscriptionId: string,
): Promise<boolean> {
  const done = await client.tenant.updateMany({
    where: { billingSubscriptionId: subscriptionId },
    data: {
      status: TenantStatus.cancelled,
      billingSubscriptionId: null,
      billingOverdueSince: null,
      billingNoticeStep: 0,
      billingInvoiceUrl: null,
    },
  });
  return done.count > 0;
}
