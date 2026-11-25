import { localParts, MS_PER_DAY, zonedToUtc } from '@app/core';

// Periods in the tenant's timezone (RN-58): a month starts at local midnight of its first day.

export const Period = { month: 'month', lastMonth: 'last_month', last90: 'last_90_days' } as const;
export type Period = (typeof Period)[keyof typeof Period];

const LAST_DAYS = 90;
const FIRST_DAY = 1;

export interface Range {
  start: Date;
  end: Date;
}

/** The calendar month `offset` months from the one `now` falls in. */
export function monthRange(now: Date, timezone: string, offset = 0): Range {
  const { year, month } = localParts(now, timezone);
  const first = new Date(Date.UTC(year, month - 1 + offset, FIRST_DAY));
  const next = new Date(Date.UTC(year, month + offset, FIRST_DAY));
  const local = (date: Date) => ({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: FIRST_DAY,
  });
  return {
    start: zonedToUtc(local(first), 0, timezone),
    end: zonedToUtc(local(next), 0, timezone),
  };
}

export function periodRange(period: Period, now: Date, timezone: string): Range {
  if (period === Period.lastMonth) return monthRange(now, timezone, -1);
  if (period === Period.last90)
    return { start: new Date(now.getTime() - LAST_DAYS * MS_PER_DAY), end: now };
  return monthRange(now, timezone);
}
