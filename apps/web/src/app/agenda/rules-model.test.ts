import { describe, expect, it } from 'vitest';
import { validWindows } from './rules-model';

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
