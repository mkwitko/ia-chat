import { MS_PER_DAY } from '../agenda/zoned.ts';
import { monthOf, PlanId, usageStatus } from '../plans.ts';

// Overdue ladder (spec 05): notice on the due date, another 3 days later, and at 7 days the
// assistant goes restricted. Days count from the due date of the oldest unpaid invoice.

export const RESTRICT_AFTER_DAYS = 7;
const SECOND_NOTICE_AFTER_DAYS = 3;
const DATE_KEY_LENGTH = 10;

export const Notice = { none: 0, first: 1, second: 2 } as const;
export type Notice = (typeof Notice)[keyof typeof Notice];

export interface OverdueStage {
  notice: Notice;
  restrict: boolean;
}

export function daysOverdue(since: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / MS_PER_DAY));
}

export function overdueStage(days: number): OverdueStage {
  return {
    notice: days >= SECOND_NOTICE_AFTER_DAYS ? Notice.second : Notice.first,
    restrict: days >= RESTRICT_AFTER_DAYS,
  };
}

/** `YYYY-MM-DD` of a date, UTC. */
export const dateKey = (date: Date): string => date.toISOString().slice(0, DATE_KEY_LENGTH);

/** A `YYYY-MM-DD` key as midnight UTC. */
export const fromDateKey = (key: string): Date => new Date(`${key}T00:00:00Z`);

/** First day of the month before `now` (the month whose overage is billed now). */
export function previousMonth(now: Date): Date {
  const month = monthOf(now);
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1));
}

/** Overage of a closed month in cents, computed on our side (spec 05). */
export function overageOf(plan: PlanId, conversations: number): number {
  return usageStatus({ plan, conversations, capCents: null }).overageCents;
}
