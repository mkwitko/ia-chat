import { AppointmentStatus, ContactOrigin, MIN_SAMPLE, recoveredMoney, type Tx } from '@app/db';
import { periodRange, type Period, type Range } from '../period.ts';
import {
  activeConversations,
  firstResponse,
  handedOffConversations,
  recoveredContacts,
  repeatBookings,
} from './results-sql.ts';

export interface ResultsInput {
  tenantId: string;
  period: Period;
  now: Date;
}

/**
 * Bookings made, cancellations made, and the attendance marks of appointments held in the period.
 * Metric 8 (M-09): a remarcação (a booking that replaces a cancelled one) counts apart from both.
 */
async function appointmentCounts(tx: Tx, { range, now }: { range: Range; now: Date }) {
  const created = { gte: range.start, lt: range.end };
  const held = { gte: range.start, lt: now < range.end ? now : range.end };
  const [booked, rescheduled, cancelled, attended, noShow, unmarked] = await Promise.all([
    tx.appointment.count({ where: { createdAt: created, rescheduledFromId: null } }),
    tx.appointment.count({ where: { createdAt: created, rescheduledFromId: { not: null } } }),
    tx.appointment.count({
      where: {
        status: AppointmentStatus.cancelled,
        updatedAt: created,
        rescheduledTo: { is: null },
      },
    }),
    tx.appointment.count({ where: { startsAt: created, status: AppointmentStatus.completed } }),
    tx.appointment.count({ where: { startsAt: created, status: AppointmentStatus.no_show } }),
    tx.appointment.count({
      where: {
        startsAt: held,
        status: { in: [AppointmentStatus.scheduled, AppointmentStatus.confirmed] },
      },
    }),
  ]);
  return { counts: { booked, rescheduled, cancelled }, attendance: { attended, noShow, unmarked } };
}

/**
 * Counts and the numerators/denominators of the rates, never a percentage: the screen shows the
 * formula and applies `minSample`. Appointment requests are not measured (nothing records them).
 */
export async function readResults(tx: Tx, { tenantId, period, now }: ResultsInput) {
  const { timezone } = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { timezone: true },
  });
  const range = periodRange(period, now, timezone);
  const created = { gte: range.start, lt: range.end };
  const [conversations, handedOff, response, recovered, repeat] = await Promise.all([
    activeConversations(tx, range),
    handedOffConversations(tx, range),
    firstResponse(tx, range),
    recoveredContacts(tx, range),
    repeatBookings(tx, range),
  ]);
  const [newContacts, origins, appointments, first, money] = await Promise.all([
    tx.contact.count({ where: { createdAt: created } }),
    tx.contact.groupBy({ by: ['origin'], where: { createdAt: created }, _count: true }),
    appointmentCounts(tx, { range, now }),
    tx.contact.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    recoveredMoney(tx, { range, timezone }),
  ]);
  return {
    period,
    range,
    timezone,
    minSample: MIN_SAMPLE,
    /** First record in the account: results only exist from here on (the baseline note). */
    dataSince: first?.createdAt ?? null,
    conversations,
    newContacts,
    byOrigin: origins.map((row) => ({ origin: row.origin, count: row._count })),
    referrals: origins.find((row) => row.origin === ContactOrigin.referral)?._count ?? 0,
    firstResponse: response,
    escalation: { handedOff, total: conversations },
    appointments: appointments.counts,
    attendance: appointments.attendance,
    recovered,
    repeatBookings: repeat,
    recoveredMoney: money,
  };
}
