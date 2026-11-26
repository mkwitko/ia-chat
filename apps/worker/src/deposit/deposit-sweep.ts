import { templateParams } from '@app/core';
import {
  AppointmentCreator,
  cancelAppointment,
  claimExpiredDeposits,
  claimUnnotifiedDeposits,
  type CalendarResolver,
  type Db,
  type ExpiredDeposit,
} from '@app/db';
import type { Alert } from '@app/observability';
import { NotifyReason, type Notifier } from '../notify/index.ts';
import type { ReminderChannel } from '../reminders/deliver.ts';
import { sendProactive } from '../waitlist/proactive.ts';
import { forEachTenant } from '../waitlist/tenants.ts';

// H-52 (spec 05, "Sinal via Pix"), every minute: tell the professional about each new deposit
// waiting for confirmation, and release the slots whose deadline passed. The patient hears about
// it only inside the 24 h window with the assistant in control (same path as the waitlist offer).

export interface DepositSweepDeps {
  db: Db;
  channel: Pick<ReminderChannel, 'send'>;
  notify: Notifier;
  alert: Alert;
  now: Date;
  calendar?: CalendarResolver | undefined;
  onlyTenantId?: string;
}

export const DepositCopy = {
  expired: (slot: { startsAt: Date; timezone: string; serviceName: string }): string => {
    const [, date = '', time = ''] = templateParams(slot);
    return `O horário de ${date} às ${time} foi liberado porque o sinal não foi confirmado a tempo. Se ainda quiser, posso ver outro horário para você.`;
  },
} as const;

export async function sweepDeposits(deps: DepositSweepDeps): Promise<number> {
  let released = 0;
  // ponytail: every tenant, every minute (payments has RLS, so no cross-tenant filter here);
  // a cheap indexed query per tenant. Filter by a tenant flag if the tenant count grows.
  await forEachTenant(deps, {}, async (tenantId) => {
    await notifyNew(deps, tenantId);
    const expired = await deps.db.withTenant(tenantId, (tx) => claimExpiredDeposits(tx, deps.now));
    for (const deposit of expired) await release(deps, { tenantId, deposit });
    released += expired.length;
  });
  return released;
}

async function notifyNew(deps: DepositSweepDeps, tenantId: string): Promise<void> {
  const ids = await deps.db.withTenant(tenantId, (tx) => claimUnnotifiedDeposits(tx, deps.now));
  // One notice per run is enough: it opens the list of every deposit waiting (RN-38: no content).
  if (ids.length > 0)
    await deps.notify({ tenantId, conversationId: '', reason: NotifyReason.depositPending });
}

async function release(
  deps: DepositSweepDeps,
  { tenantId, deposit }: { tenantId: string; deposit: ExpiredDeposit },
): Promise<void> {
  const { db, now } = deps;
  const calendar = (await deps.calendar?.(tenantId)) ?? undefined;
  const cancelled = await cancelAppointment(db, {
    tenantId,
    contactId: deposit.contactId,
    appointmentId: deposit.appointmentId,
    now,
    createdBy: AppointmentCreator.human,
    calendar,
  });
  if (!cancelled.ok) return;
  await db.withTenant(tenantId, async (tx) => {
    const { timezone } = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { timezone: true },
    });
    const text = DepositCopy.expired({
      startsAt: deposit.startsAt,
      timezone,
      serviceName: cancelled.value.serviceName,
    });
    await sendProactive(tx, {
      message: { tenantId, contactId: deposit.contactId, text, now },
      channel: deps.channel,
    });
  });
}
