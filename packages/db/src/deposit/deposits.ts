import { PaymentStatus } from '../../generated/prisma/enums.ts';
import type { Db, Tx } from '../index.ts';
import { scheduleMessages } from '../reminders/schedule.ts';

// H-52 (spec 05, "Sinal via Pix"): a booking with a deposit holds the slot as a live appointment
// plus a pending payment with a deadline. "Held" is that pair: no confirmation or reminder goes
// out until the professional confirms the money arrived; past the deadline the sweep releases it.

export const PIX_MANUAL = 'pix_manual';

/** A new deposit, or one carried from the appointment a reschedule replaces. */
export type DepositHold = { amountCents: number; expiresAt: Date } | { paymentId: string };

export async function holdDeposit(
  tx: Tx,
  input: { tenantId: string; appointmentId: string; hold: DepositHold },
): Promise<void> {
  const { tenantId, appointmentId, hold } = input;
  if ('paymentId' in hold) {
    await tx.payment.update({ where: { id: hold.paymentId }, data: { appointmentId } });
    return;
  }
  await tx.payment.create({
    data: {
      tenantId,
      appointmentId,
      amountCents: hold.amountCents,
      provider: PIX_MANUAL,
      expiresAt: hold.expiresAt,
    },
  });
}

export function pendingDepositOf(tx: Tx, appointmentId: string) {
  return tx.payment.findFirst({ where: { appointmentId, status: PaymentStatus.pending } });
}

/** A cancelled appointment leaves no deposit waiting. */
export async function dropDeposit(tx: Tx, appointmentId: string): Promise<void> {
  await tx.payment.updateMany({
    where: { appointmentId, status: PaymentStatus.pending },
    data: { status: PaymentStatus.expired },
  });
}

export const DepositOutcome = {
  confirmed: 'confirmed',
  notFound: 'not_found',
  expired: 'deposit_expired',
} as const;
export type DepositOutcome = (typeof DepositOutcome)[keyof typeof DepositOutcome];

/**
 * The professional's one tap: the money is in their account. Only this marks a deposit paid
 * (A-17: a receipt image proves nothing). The confirmation and reminders start from here.
 */
export function confirmDeposit(
  db: Db,
  req: { tenantId: string; paymentId: string; now: Date },
): Promise<DepositOutcome> {
  return db.withTenant(req.tenantId, async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: req.paymentId },
      include: { appointment: true },
    });
    if (!payment?.appointment) return DepositOutcome.notFound;
    if (payment.status === PaymentStatus.paid) return DepositOutcome.confirmed;
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.pending },
      data: { status: PaymentStatus.paid, paidAt: req.now },
    });
    if (claimed.count === 0) return DepositOutcome.expired;
    await scheduleMessages(tx, {
      tenantId: req.tenantId,
      appointment: payment.appointment,
      now: req.now,
    });
    return DepositOutcome.confirmed;
  });
}

export interface ExpiredDeposit {
  paymentId: string;
  appointmentId: string;
  contactId: string;
  startsAt: Date;
}

/** Claims the deposits past their deadline (pending -> expired); the caller frees each slot. */
export async function claimExpiredDeposits(tx: Tx, now: Date): Promise<ExpiredDeposit[]> {
  const due = await tx.payment.findMany({
    where: { status: PaymentStatus.pending, expiresAt: { lte: now } },
    include: { appointment: true },
  });
  const claimed: ExpiredDeposit[] = [];
  for (const payment of due) {
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.pending },
      data: { status: PaymentStatus.expired },
    });
    if (count === 0 || !payment.appointment) continue;
    const { id, contactId, startsAt } = payment.appointment;
    claimed.push({ paymentId: payment.id, appointmentId: id, contactId, startsAt });
  }
  return claimed;
}

/** Pending deposits the professional has not heard about yet; marks them told. */
export async function claimUnnotifiedDeposits(tx: Tx, now: Date): Promise<string[]> {
  const rows = await tx.payment.findMany({
    where: { status: PaymentStatus.pending, notifiedAt: null, expiresAt: { gt: now } },
    select: { id: true },
  });
  await tx.payment.updateMany({
    where: { id: { in: rows.map((row) => row.id) } },
    data: { notifiedAt: now },
  });
  return rows.map((row) => row.id);
}

/** The panel list (Sinais): pending deposits, soonest deadline first. Amounts in cents. */
export function listPendingDeposits(tx: Tx) {
  return tx.payment.findMany({
    where: { status: PaymentStatus.pending, appointmentId: { not: null } },
    orderBy: { expiresAt: 'asc' },
    select: {
      id: true,
      amountCents: true,
      expiresAt: true,
      appointment: {
        select: {
          startsAt: true,
          contactId: true,
          service: { select: { name: true } },
          contact: { select: { name: true, phoneE164: true } },
        },
      },
    },
  });
}
