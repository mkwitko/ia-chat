import { timeToMinute } from './agenda-dates';
import type { RuleWindow } from './agenda-api';

/** Monday first, the way the professional reads a week; 0 is Sunday (`availability_rules.weekday`). */
const Weekday = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 } as const;
export const WEEK_ORDER = [
  Weekday.mon,
  Weekday.tue,
  Weekday.wed,
  Weekday.thu,
  Weekday.fri,
  Weekday.sat,
  Weekday.sun,
];

export const NEW_WINDOW = { start: '09:00', end: '12:00' } as const;

/** Mirrors the API: each window ends after it starts and those of one day do not overlap. */
export function validWindows(rules: readonly RuleWindow[]): boolean {
  const sorted = rules.toSorted(
    (a, b) => a.weekday - b.weekday || timeToMinute(a.start) - timeToMinute(b.start),
  );
  return sorted.every((rule, index) => {
    if (!rule.start || !rule.end || timeToMinute(rule.start) >= timeToMinute(rule.end))
      return false;
    const next = sorted[index + 1];
    return !(next?.weekday === rule.weekday && timeToMinute(next.start) < timeToMinute(rule.end));
  });
}
