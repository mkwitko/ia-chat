import {
  dateKey,
  MS_PER_DAY,
  PLANS,
  PlanId,
  previousMonth,
  SELLABLE_PLANS,
  type BillingProvider,
} from '@app/core';
import { TenantStatus, type Tx } from '@app/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import type { TenantContext } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed } from '../setup/guarded.ts';
import { fail, providerFailed } from './failures.ts';

export const ENTITY = 'subscription';
const DESCRIPTION = 'Assinatura Consultório Aberto';

/** Only plans on sale: Pro and Clínica wait until their features exist (spec 01, "Preços"). */
export const planBody = z.object({ plan: z.enum(SELLABLE_PLANS) }).strict();

interface TenantRow {
  id: string;
  name: string;
  status: TenantStatus;
  trialEndsAt: Date | null;
  billingEndsAt: Date | null;
  billingCustomerId: string | null;
}

/** After the trial, or after a period already paid before a cancellation; at least tomorrow. */
const firstDueDate = (row: TenantRow, now: Date): string => {
  const tomorrow = new Date(now.getTime() + MS_PER_DAY);
  const dates = [row.trialEndsAt, row.billingEndsAt].filter((date) => date !== null);
  return dateKey(new Date(Math.max(tomorrow.getTime(), ...dates.map((date) => date.getTime()))));
};

/** Customer (once) and subscription at the provider; the first invoice's link comes along. */
async function createRemote(
  provider: BillingProvider,
  row: TenantRow,
  input: { email: string; document: string; plan: PlanId; now: Date },
) {
  const customerId =
    row.billingCustomerId ??
    (
      await provider.createCustomer({
        tenantId: row.id,
        name: row.name,
        email: input.email,
        document: input.document,
      })
    ).id;
  const subscription = await provider.createSubscription({
    customerId,
    cents: PLANS[input.plan].monthlyCents,
    firstDueDate: firstDueDate(row, input.now),
    description: DESCRIPTION,
    tenantId: row.id,
  });
  const [first] = await provider.listPayments(subscription.id);
  return { customerId, subscriptionId: subscription.id, invoiceUrl: first?.invoiceUrl ?? null };
}

interface Saved {
  row: TenantRow;
  plan: PlanId;
  now: Date;
  remote: Awaited<ReturnType<typeof createRemote>>;
}

async function save(tx: Tx, tenant: TenantContext, { row, plan, now, remote }: Saved) {
  await tx.tenant.update({
    where: { id: row.id },
    data: {
      plan,
      billingCustomerId: remote.customerId,
      billingSubscriptionId: remote.subscriptionId,
      billingInvoiceUrl: remote.invoiceUrl,
      billingOverdueSince: null,
      billingNoticeStep: 0,
      billingEndsAt: null,
      // The trial's usage is not billed as overage: counting starts with the current month.
      billingOverageThrough: previousMonth(now),
      // A cancelled tenant waits for its first payment in restricted mode.
      ...(row.status === TenantStatus.cancelled ? { status: TenantStatus.restricted } : {}),
    },
  });
  await audit(tx, tenant, {
    entity: ENTITY,
    entityId: row.id,
    action: AuditAction.create,
    after: { plan },
  });
}

/**
 * The tenant stays as it is until the webhook confirms the first invoice (a trial keeps its
 * trial, a restricted tenant stays restricted). The first invoice falls due at the end of the
 * trial, or tomorrow when the trial is over.
 */
export async function subscribe(
  request: FastifyRequest,
  reply: FastifyReply,
  provider: BillingProvider,
) {
  const input = parsed(request, reply, planBody);
  if (!input) return reply;
  const { tenant, body } = input;
  const row = await tenant.withTenant((tx) =>
    tx.tenant.findUniqueOrThrow({ where: { id: tenant.tenantId } }),
  );
  if (row.billingSubscriptionId)
    return fail(reply, HttpStatus.conflict, ErrorCode.alreadySubscribed);
  if (!row.document) return fail(reply, HttpStatus.badRequest, ErrorCode.documentRequired);
  const { email } = await request.server.db.client.user.findUniqueOrThrow({
    where: { id: tenant.userId },
    select: { email: true },
  });
  const now = new Date();
  try {
    const { document } = row;
    const remote = await createRemote(provider, row, { email, document, plan: body.plan, now });
    await tenant.withTenant((tx) => save(tx, tenant, { row, plan: body.plan, now, remote }));
  } catch (error) {
    return providerFailed(request, reply, error);
  }
  return reply.code(HttpStatus.created).send({ ok: true });
}
