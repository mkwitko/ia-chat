import { describe, expect, it } from 'vitest';
import { phoneKey, toE164 } from './phone.ts';

describe('phone key (RF-23b)', () => {
  it('treats a Brazilian mobile with and without the ninth digit as the same contact', () => {
    expect(phoneKey('+5541999990001')).toBe(phoneKey('+554199990001'));
  });

  it('accepts the digits-only form Meta sends', () => {
    expect(toE164('5541999990001')).toBe('+5541999990001');
    expect(phoneKey('5541999990001')).toBe('+554199990001');
  });

  it('keeps landlines and foreign numbers as they are', () => {
    expect(phoneKey('+554133330001')).toBe('+554133330001');
    expect(phoneKey('+14155550101')).toBe('+14155550101');
  });

  it('returns null for something that is not a phone number', () => {
    expect(toE164('abc')).toBeNull();
    expect(phoneKey('')).toBeNull();
  });
});
