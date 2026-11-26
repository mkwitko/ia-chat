import { locale } from '@/i18n/locale';
// Dates of the agenda. Days travel as `YYYY-MM-DD` of the tenant's zone; instants as ISO strings.
// Everything shown uses the tenant's timezone (RN-58), never the browser's.

const LOCALE = locale;
const SWEDISH_ISO_DAY = 'sv-SE';
const MS_PER_DAY = 86_400_000;
const MINUTES_PER_HOUR = 60;
const PAD = 2;
const ISO_DAY_LENGTH = 10;

export function addDaysIso(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * MS_PER_DAY)
    .toISOString()
    .slice(0, ISO_DAY_LENGTH);
}

/** Local day (`YYYY-MM-DD`) of an instant in the zone. */
export function dayOf(instant: string, timezone: string): string {
  return new Date(instant).toLocaleDateString(SWEDISH_ISO_DAY, { timeZone: timezone });
}

export function timeLabel(instant: string, timezone: string): string {
  return new Date(instant).toLocaleTimeString(LOCALE, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "segunda-feira, 4 de janeiro". */
export function dayTitle(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(LOCALE, {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** "seg., 4 de jan." for the phone's one-line toolbar. */
export function compactDayTitle(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(LOCALE, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** "04/01" for a range label. */
export function shortDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(LOCALE, {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  });
}

/** Minutes after midnight as `HH:MM`, and back. */
export function minuteToTime(minute: number): string {
  const pad = (value: number) => String(value).padStart(PAD, '0');
  return `${pad(Math.floor(minute / MINUTES_PER_HOUR))}:${pad(minute % MINUTES_PER_HOUR)}`;
}

export function timeToMinute(time: string): number {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  return hour * MINUTES_PER_HOUR + minute;
}

/** The last day a time off covers (its end is the first free instant). */
export function lastDayOf(endsAt: string, timezone: string): string {
  return dayOf(new Date(Date.parse(endsAt) - 1).toISOString(), timezone);
}
