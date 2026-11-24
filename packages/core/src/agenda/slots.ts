import {
  MS_PER_DAY,
  MS_PER_MINUTE,
  addDays,
  localParts,
  weekdayOf,
  zonedToUtc,
  type LocalDate,
} from './zoned.ts';

// Spec 05, "Cálculo de disponibilidade": a pure function, so the rules are tested without a database.

// Safety stop for a absurd range; the longest advance window is far below this.
const MAX_DAYS = 400;

export interface Interval {
  start: Date;
  end: Date;
}

/** Weekly wall-clock window in the tenant's timezone; weekday 0 = Sunday. */
export interface AvailabilityRule {
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
}

export interface SlotQuery {
  rules: readonly AvailabilityRule[];
  timeOffs: readonly Interval[];
  appointments: readonly Interval[];
  /** Read-only input from the Google sync (E-21). */
  externalBusy: readonly Interval[];
  durationMinutes: number;
  /** Slots start inside [from, to). */
  from: Date;
  to: Date;
  now: Date;
  timezone: string;
}

export function availableSlots(query: SlotQuery): Interval[] {
  const busy = [...query.timeOffs, ...query.appointments, ...query.externalBusy];
  return localDays(query)
    .flatMap((day) => daySlots(query, day))
    .filter((slot) => slot.start >= query.from && slot.start < query.to)
    .filter((slot) => !busy.some((other) => overlaps(slot, other)))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

function sameDay(a: LocalDate, b: LocalDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function localDays({ from, to, timezone }: SlotQuery): LocalDate[] {
  const last = localParts(to, timezone);
  const days: LocalDate[] = [];
  let day: LocalDate = localParts(from, timezone);
  while (days.length < MAX_DAYS) {
    days.push(day);
    if (sameDay(day, last)) break;
    day = addDays(day, 1);
  }
  return days;
}

function daySlots(query: SlotQuery, day: LocalDate): Interval[] {
  const weekday = weekdayOf(day);
  return query.rules
    .filter((rule) => rule.weekday === weekday)
    .flatMap((rule) => ruleSlots(query, { rule, day }));
}

/**
 * Slots sit on a grid from the window start (duration + interval apart).
 * ponytail: a booking off the grid blocks the slots it touches but does not shift the grid.
 */
function ruleSlots(query: SlotQuery, { rule, day }: { rule: AvailabilityRule; day: LocalDate }) {
  const { timezone, durationMinutes, now } = query;
  const length = durationMinutes * MS_PER_MINUTE;
  const earliest = now.getTime() + rule.minNoticeMinutes * MS_PER_MINUTE;
  const latest = now.getTime() + rule.maxAdvanceDays * MS_PER_DAY;
  const windowEnd = zonedToUtc(day, rule.endMinute, timezone).getTime();
  const step = length + rule.slotIntervalMinutes * MS_PER_MINUTE;
  const slots: Interval[] = [];
  for (
    let start = zonedToUtc(day, rule.startMinute, timezone).getTime();
    start + length <= windowEnd;
    start += step
  ) {
    if (start >= earliest && start <= latest) {
      slots.push({ start: new Date(start), end: new Date(start + length) });
    }
  }
  return slots;
}
