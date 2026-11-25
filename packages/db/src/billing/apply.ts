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

/** Not paying yet (invited consultório before its WhatsApp, H-24; or in the trial). */
const BEFORE_PAYING: ReadonlySet<TenantStatus> = new Set([TenantStatus.setup, TenantStatus.trial]);
const REOPENS: ReadonlySet<TenantStatus> = new Set([...BEFORE_PAYING, TenantStatus.restricted]);
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

/** A paid invoice reopens a setup, trial or restricted tenant, unless an older invoice is still open. */
async function applyPaid(client: Client, tenant: TenantState, due: Date): Promise<boolean> {
  const clears = !tenant.billingOverdueSince || due >= tenant.billingOverdueSince;
  const reopen = REOPENS.has(tenant.status);
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

const nextMonth = (date: Date): Date => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
};

/**
 * The subscription is gone at the provider (we cancelled it, or support did). The assistant keeps
 * working until the end of the month already paid, or of the trial (the trial sweep ends that);
 * the daily billing job stops it at `billing_ends_at`. Nothing paid ahead: it stops now.
 */
export async function markSubscriptionCancelled(
  client: Client,
  subscriptionId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const tenant = await client.tenant.findUnique({
    where: { billingSubscriptionId: subscriptionId },
    select: { id: true, status: true, billingPaidDueDate: true },
  });
  if (!tenant) return false;
  const paidUntil = tenant.billingPaidDueDate ? nextMonth(tenant.billingPaidDueDate) : null;
  const endsAt = paidUntil && paidUntil > now ? paidUntil : null;
  const keepsOn = endsAt !== null || BEFORE_PAYING.has(tenant.status);
  await client.tenant.update({
    where: { id: tenant.id },
    data: {
      billingSubscriptionId: null,
      billingOverdueSince: null,
      billingNoticeStep: 0,
      billingInvoiceUrl: null,
      billingEndsAt: endsAt,
      ...(keepsOn ? {} : { status: TenantStatus.cancelled }),
    },
  });
  return true;
}
