import type { Interval } from './slots.ts';
import { localParts } from './zoned.ts';

// Spec 05: the assistant gets at most 6 options, spread over different days and periods.

export const MAX_OPTIONS = 6;
const NOON = 720;
const SIX_PM = 1_080;
const Period = { morning: 'morning', afternoon: 'afternoon', evening: 'evening' } as const;

function periodOf(minuteOfDay: number): string {
  if (minuteOfDay < NOON) return Period.morning;
  return minuteOfDay < SIX_PM ? Period.afternoon : Period.evening;
}

/** Round-robin over (day, period) buckets, so no day or period hogs the list. */
export function pickSpread(
  slots: readonly Interval[],
  { timezone, max = MAX_OPTIONS }: { timezone: string; max?: number },
): Interval[] {
  const buckets = new Map<string, Interval[]>();
  for (const slot of slots) {
    const { year, month, day, minuteOfDay } = localParts(slot.start, timezone);
    const key = [year, month, day, periodOf(minuteOfDay)].join('-');
    buckets.set(key, [...(buckets.get(key) ?? []), slot]);
  }
  const queues = [...buckets.values()];
  const picked: Interval[] = [];
  for (let round = 0; picked.length < max && queues.some((q) => q.length > round); round += 1) {
    for (const queue of queues) {
      const slot = queue[round];
      if (slot && picked.length < max) picked.push(slot);
    }
  }
  return picked.sort((a, b) => a.start.getTime() - b.start.getTime());
}
