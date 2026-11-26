import { MS_PER_DAY } from '@app/core';
import {
  AppointmentStatus,
  endingPackages,
  localDayRange,
  MIN_SAMPLE,
  PipelineStage,
  recoveredMoney,
  type Tx,
} from '@app/db';
import { InboxState, listConversations } from '../conversations/view.ts';
import { listCustomers } from '../customers/customers-view.ts';
import { monthRange, type Range } from '../period.ts';
import { pendingCount } from '../setup/unanswered-routes.ts';

// Spec 10, "Início": the month in four real counts, then what needs the owner, each with a place
// to act. Everything is counted from rows; nothing is estimated.

const SHOWN = 5;
const CONFIRM_DAYS = 2;
const RECOVERY_DAYS = 30;
const LIVE = [AppointmentStatus.scheduled, AppointmentStatus.confirmed];
const NEEDS_YOU: readonly InboxState[] = [InboxState.awaitingApproval, InboxState.needsYou];
const withPeople = { contact: { select: { name: true, phoneE164: true } }, service: true } as const;

interface AppointmentRow {
  id: string;
  startsAt: Date;
  status: AppointmentStatus;
  contactId: string;
  contact: { name: string | null; phoneE164: string | null };
  service: { name: string };
}

const appointmentItem = (row: AppointmentRow) => ({
  id: row.id,
  startsAt: row.startsAt,
  status: row.status,
  contactId: row.contactId,
  patientName: row.contact.name ?? row.contact.phoneE164,
  serviceName: row.service.name,
});

/** Contacts, bookings and cancellations of the month (a cancellation counts when it was made). */
async function monthCounts(tx: Tx, month: Range) {
  const inMonth = { gte: month.start, lt: month.end };
  const [contacts, booked, cancelled] = await Promise.all([
    tx.contact.count({ where: { createdAt: inMonth } }),
    tx.appointment.count({
      where: { createdAt: inMonth, status: { not: AppointmentStatus.cancelled } },
    }),
    tx.appointment.count({ where: { status: AppointmentStatus.cancelled, updatedAt: inMonth } }),
  ]);
  return { contacts, booked, cancelled };
}

async function appointmentLists(tx: Tx, { now, day }: { now: Date; day: Range }) {
  const confirmUntil = new Date(now.getTime() + CONFIRM_DAYS * MS_PER_DAY);
  const [today, toConfirm, toMark] = await Promise.all([
    tx.appointment.findMany({
      where: { status: { in: LIVE }, startsAt: { gte: day.start, lt: day.end } },
      include: withPeople,
      orderBy: { startsAt: 'asc' },
    }),
    tx.appointment.findMany({
      where: { status: AppointmentStatus.scheduled, startsAt: { gt: now, lt: confirmUntil } },
      include: withPeople,
      orderBy: { startsAt: 'asc' },
      take: SHOWN,
    }),
    tx.appointment.findMany({
      where: { status: { in: LIVE }, startsAt: { lt: now } },
      include: withPeople,
      orderBy: { startsAt: 'desc' },
      take: SHOWN,
    }),
  ]);
  return {
    today: today.map(appointmentItem),
    toConfirm: toConfirm.map(appointmentItem),
    toMark: toMark.map(appointmentItem),
  };
}

/** "Não agendou" contacts, and the ones still worth a message: not opted out, active in 30 days. */
async function notBookedSummary(tx: Tx, now: Date) {
  const notBooked = await listCustomers(tx, { q: '', stage: PipelineStage.not_booked, now });
  const since = now.getTime() - RECOVERY_DAYS * MS_PER_DAY;
  const recoverable = notBooked.filter(
    (item) => !item.optedOut && (item.lastContactAt?.getTime() ?? 0) >= since,
  );
  return {
    count: notBooked.length,
    recoverable: recoverable.length,
    items: recoverable.slice(0, SHOWN),
  };
}

export async function readHome(tx: Tx, { tenantId, now }: { tenantId: string; now: Date }) {
  const { timezone, firstBookingSeenAt } = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { timezone: true, firstBookingSeenAt: true },
  });
  const month = monthRange(now, timezone);
  const [conversations, counts, lists, unanswered, notBooked, recovered] = await Promise.all([
    listConversations(tx),
    monthCounts(tx, month),
    appointmentLists(tx, { now, day: localDayRange(now, timezone) }),
    pendingCount(tx),
    notBookedSummary(tx, now),
    recoveredMoney(tx, { range: month, timezone }),
  ]);
  const ending = await endingPackages(tx, now);
  const waiting = conversations.filter((item) => NEEDS_YOU.includes(item.state));
  return {
    timezone,
    month: { ...counts, awaiting: waiting.length },
    recovered: {
      count: recovered.count,
      valueCents: recovered.valueCents,
      afterHours: recovered.afterHours,
      minSample: MIN_SAMPLE,
    },
    attention: {
      conversations: waiting.slice(0, SHOWN),
      drafts: waiting.filter((item) => item.state === InboxState.awaitingApproval).length,
      unanswered,
      toMark: lists.toMark,
      endingPackages: ending,
    },
    today: lists.today,
    toConfirm: lists.toConfirm,
    notBooked,
    firstBookingSeen: firstBookingSeenAt !== null,
  };
}
