// Wall-clock <-> instant conversion for one IANA timezone, with Intl only (no dependency).

export const MS_PER_MINUTE = 60_000;
export const MINUTES_PER_DAY = 1_440;
export const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;
const MINUTES_PER_HOUR = 60;

export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

export interface LocalParts extends LocalDate {
  minuteOfDay: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timezone);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  formatters.set(timezone, created);
  return created;
}

export function localParts(instant: Date, timezone: string): LocalParts {
  const values: Record<string, number> = {};
  for (const part of formatterFor(timezone).formatToParts(instant)) {
    values[part.type] = Number(part.value);
  }
  const { year = 0, month = 0, day = 0, hour = 0, minute = 0 } = values;
  return { year, month, day, minuteOfDay: hour * MINUTES_PER_HOUR + minute };
}

/** Milliseconds the zone is ahead of UTC at that instant. */
function offsetMs(instant: Date, timezone: string): number {
  const local = localParts(instant, timezone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, 0, local.minuteOfDay);
  const whole = Math.floor(instant.getTime() / MS_PER_MINUTE) * MS_PER_MINUTE;
  return asUtc - whole;
}

/**
 * The instant at which the zone's wall clock reads that date and minute of day.
 * ponytail: a time inside a DST gap resolves to one side of it; no BR zone has DST today.
 */
export function zonedToUtc(date: LocalDate, minuteOfDay: number, timezone: string): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day, 0, minuteOfDay);
  const first = guess - offsetMs(new Date(guess), timezone);
  return new Date(guess - offsetMs(new Date(first), timezone));
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const moved = new Date(Date.UTC(date.year, date.month - 1, date.day) + days * MS_PER_DAY);
  return { year: moved.getUTCFullYear(), month: moved.getUTCMonth() + 1, day: moved.getUTCDate() };
}

/** 0 = Sunday, like `availability_rules.weekday`. */
export function weekdayOf(date: LocalDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

const PAD = 2;
const two = (value: number): string => String(value).padStart(PAD, '0');

/** `2027-01-04T09:00:00-03:00`: the wall clock of the zone, so the hour reads as the patient sees it. */
export function toLocalIso(instant: Date, timezone: string): string {
  const { year, month, day, minuteOfDay } = localParts(instant, timezone);
  const offset = Math.round(offsetMs(instant, timezone) / MS_PER_MINUTE);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const clock = `${two(Math.floor(minuteOfDay / MINUTES_PER_HOUR))}:${two(minuteOfDay % MINUTES_PER_HOUR)}`;
  const zone = `${two(Math.floor(abs / MINUTES_PER_HOUR))}:${two(abs % MINUTES_PER_HOUR)}`;
  return `${String(year)}-${two(month)}-${two(day)}T${clock}:00${sign}${zone}`;
}
