// Geometry of the landing's day ruler: a day from 8h to 22h, labelled every two hours.
export const DAY_START = 8;
export const DAY_HOURS = 14;
const HOUR_LABEL_STEP = 2;
const MINUTES_PER_HOUR = 60;
const PERCENT = 100;
const CLOCK_DIGITS = 2;

export const HOUR_LABELS = Array.from(
  { length: DAY_HOURS / HOUR_LABEL_STEP + 1 },
  (_, i) => DAY_START + i * HOUR_LABEL_STEP,
);

/** Horizontal position of a time on the ruler, as a CSS percentage. */
export function dayOffset(hour: number, minute = 0): string {
  const hours = hour - DAY_START + minute / MINUTES_PER_HOUR;
  return `${String((hours / DAY_HOURS) * PERCENT)}%`;
}

export function clock(hour: number, minute: number): string {
  return `${String(hour)}:${String(minute).padStart(CLOCK_DIGITS, '0')}`;
}
