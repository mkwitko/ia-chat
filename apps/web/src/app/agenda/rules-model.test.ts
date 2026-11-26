import { describe, expect, it } from 'vitest';
import { applyToDays, validWindows } from './rules-model';

describe('the same hours on several days', () => {
  it('replaces only the chosen days', () => {
    const rules = [
      { weekday: 1, start: '09:00', end: '12:00' },
      { weekday: 1, start: '14:00', end: '18:00' },
      { weekday: 6, start: '08:00', end: '12:00' },
    ];
    const next = applyToDays(rules, [1, 2], { start: '08:00', end: '17:00' });
    expect(next).toEqual([
      { weekday: 6, start: '08:00', end: '12:00' },
      { weekday: 1, start: '08:00', end: '17:00' },
      { weekday: 2, start: '08:00', end: '17:00' },
    ]);
  });
});

const monday = (start: string, end: string) => ({ weekday: 1, start, end });

describe('weekly windows', () => {
  it('accepts several windows in a day', () => {
    expect(validWindows([monday('09:00', '12:00'), monday('14:00', '18:00')])).toBe(true);
  });

  it('refuses overlaps, inverted windows and empty times', () => {
    expect(validWindows([monday('09:00', '12:00'), monday('11:00', '13:00')])).toBe(false);
    expect(validWindows([monday('12:00', '09:00')])).toBe(false);
    expect(validWindows([monday('', '09:00')])).toBe(false);
  });

  it('windows of different days never clash', () => {
    expect(
      validWindows([monday('09:00', '12:00'), { weekday: 2, start: '09:00', end: '12:00' }]),
    ).toBe(true);
  });
});
