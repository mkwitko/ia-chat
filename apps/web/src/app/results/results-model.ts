// Pure decisions behind the Resultados screen. A rate is only shown when its denominator reaches
// the API's minimum sample; below it the screen shows the raw counts. Never invent numbers.

const PERCENT = 100;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

export const Shown = { ok: 'ok', insufficient: 'insufficient' } as const;

export type Rate =
  | { kind: typeof Shown.ok; percent: number; part: number; total: number }
  | { kind: typeof Shown.insufficient; part: number; total: number };

/** `part` of `total` as a whole percent, or "insufficient" when `total` is under `minSample`. */
export function rateOf(part: number, total: number, minSample: number): Rate {
  if (total < minSample || total === 0) return { kind: Shown.insufficient, part, total };
  return { kind: Shown.ok, percent: Math.round((part / total) * PERCENT), part, total };
}

export type Duration =
  { kind: typeof Shown.ok; label: string } | { kind: typeof Shown.insufficient; sample: number };

/** Median first response as minutes or hours; null or a small sample means not enough data. */
export function durationOf(seconds: number | null, sample: number, minSample: number): Duration {
  if (seconds === null || sample < minSample) return { kind: Shown.insufficient, sample };
  return { kind: Shown.ok, label: formatSeconds(seconds) };
}

/** "menos de 1 min", "12 min", "1 h", "1 h 20 min". */
export function formatSeconds(seconds: number): string {
  const minutes = Math.round(seconds / SECONDS_PER_MINUTE);
  if (minutes < 1) return 'menos de 1 min';
  if (minutes < MINUTES_PER_HOUR) return `${String(minutes)} min`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return rest === 0 ? `${String(hours)} h` : `${String(hours)} h ${String(rest)} min`;
}

export type Money =
  | { kind: typeof Shown.ok; count: number; cents: number }
  | { kind: typeof Shown.insufficient; count: number };

/** "Dinheiro recuperado": the sum is shown only from `minSample` attended bookings on. */
export function moneyOf(count: number, cents: number, minSample: number): Money {
  if (count < minSample || count === 0) return { kind: Shown.insufficient, count };
  return { kind: Shown.ok, count, cents };
}
