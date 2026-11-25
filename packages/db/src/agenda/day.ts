import { addDays, localParts, zonedToUtc, type LocalDate } from '@app/core';
import { AppointmentStatus } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';

const PAD = 2;
const two = (value: number): string => String(value).padStart(PAD, '0');

export interface DayRange {
  /** Local date, `YYYY-MM-DD`. */
  day: string;
  start: Date;
  end: Date;
}

/** `YYYY-MM-DD` of a local date. */
export const isoDay = ({ year, month, day }: LocalDate): string =>
  `${String(year)}-${two(month)}-${two(day)}`;

/** The local calendar day `offset` days from the day `instant` falls on, as UTC bounds. */
export function localDayRange(instant: Date, timezone: string, offset = 0): DayRange {
  const first = addDays(localParts(instant, timezone), offset);
  return {
    day: isoDay(first),
    start: zonedToUtc(first, 0, timezone),
    end: zonedToUtc(addDays(first, 1), 0, timezone),
  };
}

/** Local date -> UTC bounds of that day. */
export function dayBounds(date: LocalDate, timezone: string): { start: Date; end: Date } {
  return { start: zonedToUtc(date, 0, timezone), end: zonedToUtc(addDays(date, 1), 0, timezone) };
}

export interface AgendaSummaryCount {
  count: number;
  day: string;
}

/** RF-15: how many live appointments the next local day holds. */
export async function tomorrowCount(
  tx: Tx,
  { tenantId, now }: { tenantId: string; now: Date },
): Promise<AgendaSummaryCount> {
  const { timezone } = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { timezone: true },
  });
  const { day, start, end } = localDayRange(now, timezone, 1);
  const count = await tx.appointment.count({
    where: { status: { not: AppointmentStatus.cancelled }, startsAt: { gte: start, lt: end } },
  });
  return { count, day };
}
