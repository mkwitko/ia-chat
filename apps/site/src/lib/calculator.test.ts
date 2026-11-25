import { describe, expect, it } from 'vitest';
import { lostRevenue } from './calculator.ts';
import { formatBrl } from './money.ts';

describe('lostRevenue', () => {
  it('multiplies the visitor inputs and sums both causes, in cents', () => {
    const result = lostRevenue({
      unansweredMessages: 20,
      bookingPercent: 10,
      noShows: 3,
      consultReais: 180,
    });
    expect(result).toEqual({ unansweredCents: 36_000, noShowCents: 54_000, totalCents: 90_000 });
  });

  it('never goes negative nor above 100% booking', () => {
    const result = lostRevenue({
      unansweredMessages: 10,
      bookingPercent: 250,
      noShows: -4,
      consultReais: 100,
    });
    expect(result).toEqual({ unansweredCents: 100_000, noShowCents: 0, totalCents: 100_000 });
  });

  it('is zero with empty inputs', () => {
    expect(
      lostRevenue({ unansweredMessages: 0, bookingPercent: 0, noShows: 0, consultReais: 0 })
        .totalCents,
    ).toBe(0);
  });
});

describe('formatBrl', () => {
  it('formats cents in Brazilian reais', () => {
    expect(formatBrl(19_700).replace(/\s/g, ' ')).toBe('R$ 197,00');
  });
});
