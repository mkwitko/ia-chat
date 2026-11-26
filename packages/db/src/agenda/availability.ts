import {
  MINUTES_PER_DAY,
  MS_PER_MINUTE,
  availableSlots,
  type AvailabilityRule,
  type Interval,
} from '@app/core';
import { AppointmentStatus } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';
import { externalBusyOf, type CalendarLink } from '../calendar/link.ts';
import { AgendaFailure, AgendaError } from './types.ts';

const MINUTES_PER_HOUR = 60;
const NOT_CANCELLED = { not: AppointmentStatus.cancelled };

export interface AgendaScope {
  timezone: string;
  cancelNoticeMinutes: number;
  locationId: string | null;
}

/** The tenant's agenda settings; a tenant without a professional has no agenda. */
export async function loadScope(tx: Tx): Promise<AgendaScope> {
  const professional = await tx.professional.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!professional) throw new AgendaFailure(AgendaError.noProfessional);
  // `tenants` has no RLS: the row is picked by the (RLS-filtered) professional's tenant, never "the first".
  const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: professional.tenantId } });
  const location = await tx.location.findFirst({ orderBy: { createdAt: 'asc' } });
  return {
    timezone: tenant.timezone,
    cancelNoticeMinutes: tenant.cancelNoticeMinutes,
    locationId: location?.id ?? null,
  };
}

/**
 * H-45: the tenant's Google Calendar (E-21) is the first professional's. The others run on the
 * panel's rules only, so their bookings neither read nor write it.
 */
export async function calendarFor(
  tx: Tx,
  { professionalId, calendar }: { professionalId: string; calendar?: CalendarLink | undefined },
): Promise<CalendarLink | undefined> {
  if (!calendar) return undefined;
  const first = await tx.professional.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return first?.id === professionalId ? calendar : undefined;
}

const minuteOf = (time: Date): number =>
  time.getUTCHours() * MINUTES_PER_HOUR + time.getUTCMinutes();

export interface SlotWindow {
  professionalId: string;
  timezone: string;
  durationMinutes: number;
  from: Date;
  to: Date;
  now: Date;
  /** The tenant's connected calendar: its busy time is subtracted for its owner (E-21, H-45). */
  calendar?: CalendarLink | undefined;
}

/** Reads the inputs of `availableSlots` for one professional. */
export async function slotsIn(tx: Tx, window: SlotWindow): Promise<Interval[]> {
  const { professionalId, from, to, calendar, ...query } = window;
  const longest = window.durationMinutes * MS_PER_MINUTE;
  const [rules, timeOffs, booked, externalBusy] = await Promise.all([
    tx.availabilityRule.findMany({ where: { professionalId } }),
    tx.timeOff.findMany({ where: { professionalId, startsAt: { lt: to }, endsAt: { gt: from } } }),
    tx.appointment.findMany({
      where: {
        professionalId,
        status: NOT_CANCELLED,
        startsAt: { lt: new Date(to.getTime() + longest) },
        endsAt: { gt: from },
      },
    }),
    calendarFor(tx, { professionalId, calendar }).then((link) =>
      externalBusyOf(link, { from, to: new Date(to.getTime() + longest) }),
    ),
  ]);
  return availableSlots({
    rules: rules.map(toRule),
    timeOffs: timeOffs.map((off) => ({ start: off.startsAt, end: off.endsAt })),
    appointments: booked.map((one) => ({ start: one.startsAt, end: one.endsAt })),
    externalBusy,
    from,
    to,
    ...query,
  });
}

function toRule(rule: {
  weekday: number;
  startTime: Date;
  endTime: Date;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
}): AvailabilityRule {
  return {
    weekday: rule.weekday,
    startMinute: minuteOf(rule.startTime),
    endMinute: minuteOf(rule.endTime) || MINUTES_PER_DAY,
    slotIntervalMinutes: rule.slotIntervalMinutes,
    minNoticeMinutes: rule.minNoticeMinutes,
    maxAdvanceDays: rule.maxAdvanceDays,
  };
}
