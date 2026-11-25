import { daysOverdue, overdueEmail, overdueStage, type OverdueStage } from '@app/core';
import { TenantStatus } from '@app/db';
import { ownerEmail } from '../trial/owner-email.ts';
import type { BillingDeps, BillingResult } from './types.ts';

type Counts = Pick<BillingResult, 'noticed' | 'restricted'>;

interface LateTenant {
  id: string;
  status: TenantStatus;
  billingNoticeStep: number;
  billingInvoiceUrl: string | null;
}

/** Sends the notice of this stage once: the claim is one conditional update. */
async function notify(
  deps: BillingDeps,
  tenant: LateTenant,
  stage: OverdueStage,
): Promise<boolean> {
  if (stage.notice <= tenant.billingNoticeStep) return false;
  const claimed = await deps.db.client.tenant.updateMany({
    where: { id: tenant.id, billingNoticeStep: { lt: stage.notice } },
    data: { billingNoticeStep: stage.notice },
  });
  const to = claimed.count > 0 ? await ownerEmail(deps.db, tenant.id) : null;
  if (!to) return false;
  const { billingInvoiceUrl: invoiceUrl } = tenant;
  await deps.email.send(overdueEmail({ to, stage, panelUrl: deps.panelUrl, invoiceUrl }));
  return true;
}

/**
 * Overdue ladder (spec 05): first notice, second notice 3 days later, restricted mode at 7 days
 * from the due date. Each step runs once.
 */
export async function climbLadder(deps: BillingDeps): Promise<Counts> {
  const counts: Counts = { noticed: 0, restricted: 0 };
  const late = await deps.db.client.tenant.findMany({
    where: {
      billingOverdueSince: { not: null },
      status: { not: TenantStatus.cancelled },
      ...(deps.onlyTenantId ? { id: deps.onlyTenantId } : {}),
    },
    select: {
      id: true,
      status: true,
      billingOverdueSince: true,
      billingNoticeStep: true,
      billingInvoiceUrl: true,
    },
  });
  for (const tenant of late) {
    if (!tenant.billingOverdueSince) continue;
    const stage = overdueStage(daysOverdue(tenant.billingOverdueSince, deps.now));
    if (await notify(deps, tenant, stage)) counts.noticed += 1;
    if (!stage.restrict || tenant.status === TenantStatus.restricted) continue;
    await deps.db.client.tenant.update({
      where: { id: tenant.id },
      data: { status: TenantStatus.restricted },
    });
    counts.restricted += 1;
  }
  return counts;
}
