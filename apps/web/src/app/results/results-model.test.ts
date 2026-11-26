import { describe, expect, it } from 'vitest';
import { durationOf, formatSeconds, moneyOf, rateOf } from './results-model';

describe('rateOf', () => {
  it('rounds to a whole percent when the sample is enough', () => {
    expect(rateOf(1, 3, 3)).toEqual({ kind: 'ok', percent: 33, part: 1, total: 3 });
    expect(rateOf(2, 3, 3)).toEqual({ kind: 'ok', percent: 67, part: 2, total: 3 });
  });

  it('keeps the raw counts when the sample is too small', () => {
    expect(rateOf(1, 2, 5)).toEqual({ kind: 'insufficient', part: 1, total: 2 });
    expect(rateOf(0, 0, 0)).toEqual({ kind: 'insufficient', part: 0, total: 0 });
  });
});

describe('durationOf', () => {
  it('needs both a value and a sample', () => {
    expect(durationOf(600, 10, 5)).toEqual({ kind: 'ok', label: '10 min' });
    expect(durationOf(600, 2, 5)).toEqual({ kind: 'insufficient', sample: 2 });
    expect(durationOf(null, 10, 5)).toEqual({ kind: 'insufficient', sample: 10 });
  });
});

describe('formatSeconds', () => {
  it('reads as minutes or hours', () => {
    expect(formatSeconds(20)).toBe('menos de 1 min');
    expect(formatSeconds(90)).toBe('2 min');
    expect(formatSeconds(3600)).toBe('1 h');
    expect(formatSeconds(4800)).toBe('1 h 20 min');
  });
});

describe('moneyOf', () => {
  it('shows the sum only once the count reaches the sample', () => {
    expect(moneyOf(5, 90_000, 5)).toEqual({ kind: 'ok', count: 5, cents: 90_000 });
    expect(moneyOf(4, 72_000, 5)).toEqual({ kind: 'insufficient', count: 4 });
    expect(moneyOf(0, 0, 5)).toEqual({ kind: 'insufficient', count: 0 });
  });
});
