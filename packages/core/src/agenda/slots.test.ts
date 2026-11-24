import { describe, expect, it } from 'vitest';
import { availableSlots, type AvailabilityRule, type SlotQuery } from './slots.ts';
import { MAX_OPTIONS, pickSpread } from './spread.ts';
import { toLocalIso } from './zoned.ts';

const SP = 'America/Sao_Paulo';
const MONDAY = 1;
const MORNING = { startMinute: 9 * 60, endMinute: 12 * 60 };
const rule = (overrides: Partial<AvailabilityRule> = {}): AvailabilityRule => ({
  weekday: MONDAY,
  ...MORNING,
  slotIntervalMinutes: 0,
  minNoticeMinutes: 120,
  maxAdvanceDays: 30,
  ...overrides,
});
// Fri 2027-01-01 09:00 in Sao Paulo; the next Monday is 2027-01-04.
const query = (overrides: Partial<SlotQuery> = {}): SlotQuery => ({
  rules: [rule()],
  timeOffs: [],
  appointments: [],
  externalBusy: [],
  durationMinutes: 60,
  from: new Date('2027-01-01T12:00:00Z'),
  to: new Date('2027-01-08T12:00:00Z'),
  now: new Date('2027-01-01T12:00:00Z'),
  timezone: SP,
  ...overrides,
});
const starts = (q: SlotQuery) => availableSlots(q).map((slot) => slot.start.toISOString());
const at = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });

describe('availableSlots', () => {
  it('turns the weekly window into slots, read in the tenant timezone', () => {
    expect(starts(query())).toEqual([
      '2027-01-04T12:00:00.000Z',
      '2027-01-04T13:00:00.000Z',
      '2027-01-04T14:00:00.000Z',
    ]);
  });

  it('follows the zone offset when it changes (DST zone)', () => {
    const newYork = (from: string, to: string) =>
      starts(
        query({
          timezone: 'America/New_York',
          rules: [rule({ weekday: 0, startMinute: 9 * 60, endMinute: 10 * 60 })],
          from: new Date(from),
          to: new Date(to),
          now: new Date(from),
        }),
      );
    expect(newYork('2027-03-07T00:00:00Z', '2027-03-08T00:00:00Z')).toEqual([
      '2027-03-07T14:00:00.000Z',
    ]);
    expect(newYork('2027-03-14T00:00:00Z', '2027-03-15T00:00:00Z')).toEqual([
      '2027-03-14T13:00:00.000Z',
    ]);
  });

  it('keeps a late slot on its local day when UTC is already the next day', () => {
    const late = query({
      rules: [rule({ startMinute: 22 * 60, endMinute: 24 * 60 })],
      durationMinutes: 60,
    });
    expect(starts(late)).toEqual(['2027-01-05T01:00:00.000Z', '2027-01-05T02:00:00.000Z']);
  });

  it('offers nothing when the service is longer than the window', () => {
    expect(starts(query({ durationMinutes: 4 * 60 }))).toEqual([]);
    expect(starts(query({ durationMinutes: 3 * 60 }))).toEqual(['2027-01-04T12:00:00.000Z']);
  });

  it('removes a holiday registered as time off', () => {
    const holiday = at('2027-01-04T03:00:00Z', '2027-01-05T03:00:00Z');
    expect(starts(query({ timeOffs: [holiday] }))).toEqual([]);
  });

  it('removes slots that overlap appointments and external busy time', () => {
    const q = query({
      appointments: [at('2027-01-04T12:00:00Z', '2027-01-04T13:00:00Z')],
      externalBusy: [at('2027-01-04T13:30:00Z', '2027-01-04T13:45:00Z')],
    });
    expect(starts(q)).toEqual(['2027-01-04T14:00:00.000Z']);
  });

  it('applies the minimum notice', () => {
    const now = new Date('2027-01-04T11:30:00Z'); // 08:30 local
    const q = query({ now, from: now, to: new Date('2027-01-04T20:00:00Z') });
    expect(starts(q)).toEqual(['2027-01-04T14:00:00.000Z']); // earliest 10:30 local
  });

  it('applies the maximum advance', () => {
    expect(starts(query({ rules: [rule({ maxAdvanceDays: 2 })] }))).toEqual([]);
  });

  it('spaces slots by the configured interval', () => {
    const q = query({ rules: [rule({ slotIntervalMinutes: 15 })], durationMinutes: 30 });
    expect(starts(q).slice(0, 2)).toEqual(['2027-01-04T12:00:00.000Z', '2027-01-04T12:45:00.000Z']);
  });

  it('merges several windows of the same weekday', () => {
    const afternoon = rule({ startMinute: 14 * 60, endMinute: 15 * 60 });
    expect(starts(query({ rules: [rule(), afternoon] })).at(-1)).toBe('2027-01-04T17:00:00.000Z');
  });
});

describe('pickSpread', () => {
  const wide = query({
    rules: [rule({ weekday: 1 }), rule({ weekday: 2 }), rule({ weekday: 3 })],
    to: new Date('2027-01-08T12:00:00Z'),
  });

  it('returns at most 6 options, sorted, covering every day available', () => {
    const picked = pickSpread(availableSlots(wide), { timezone: SP });
    expect(picked).toHaveLength(MAX_OPTIONS);
    const days = new Set(picked.map((slot) => slot.start.toISOString().slice(0, 10)));
    expect(days.size).toBe(3);
    expect(picked).toEqual([...picked].sort((a, b) => a.start.getTime() - b.start.getTime()));
  });

  it('mixes morning and afternoon of one day before repeating a period', () => {
    const day = query({
      rules: [rule({ startMinute: 8 * 60, endMinute: 18 * 60 })],
      to: new Date('2027-01-05T00:00:00Z'),
    });
    const hours = pickSpread(availableSlots(day), { timezone: SP, max: 2 }).map((s) =>
      s.start.getUTCHours(),
    );
    expect(hours).toEqual([11, 15]); // 08:00 and 12:00 local
  });

  it('returns what exists when there are fewer than the maximum', () => {
    expect(pickSpread(availableSlots(query()), { timezone: SP })).toHaveLength(3);
  });
});

describe('toLocalIso', () => {
  it('prints the wall clock with the zone offset', () => {
    expect(toLocalIso(new Date('2027-01-04T12:00:00Z'), SP)).toBe('2027-01-04T09:00:00-03:00');
    expect(toLocalIso(new Date('2027-03-14T13:00:00Z'), 'America/New_York')).toBe(
      '2027-03-14T09:00:00-04:00',
    );
  });
});
