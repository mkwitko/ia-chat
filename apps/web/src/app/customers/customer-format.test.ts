import { describe, expect, it } from 'vitest';
import { formatPhone } from './customer-format';

describe('formatPhone', () => {
  it('writes Brazilian numbers the way people read them', () => {
    expect(formatPhone('+5511900000000')).toBe('+55 11 90000-0000');
    expect(formatPhone('+551133334444')).toBe('+55 11 3333-4444');
  });

  it('leaves other numbers as they came', () => {
    expect(formatPhone('+14155550100')).toBe('+14155550100');
  });
});
