import { reaisToCents } from './money.ts';

const PERCENT = 100;

export interface CalculatorInput {
  /** Messages per month that arrive when nobody can answer quickly. */
  unansweredMessages: number;
  /** Of those, the share (0 to 100) that would book if answered at once. */
  bookingPercent: number;
  /** Appointments missed per month without a confirmation reminder. */
  noShows: number;
  /** What one appointment is worth, in reais. */
  consultReais: number;
}

export interface CalculatorResult {
  unansweredCents: number;
  noShowCents: number;
  totalCents: number;
}

/**
 * Revenue at risk per month. Every figure comes from the visitor's own inputs;
 * nothing here promises a result (RF-71).
 */
export function lostRevenue(input: CalculatorInput): CalculatorResult {
  const consultCents = reaisToCents(Math.max(0, input.consultReais));
  const bookings =
    (Math.max(0, input.unansweredMessages) * clampPercent(input.bookingPercent)) / PERCENT;
  const unansweredCents = Math.round(bookings * consultCents);
  const noShowCents = Math.round(Math.max(0, input.noShows) * consultCents);
  return { unansweredCents, noShowCents, totalCents: unansweredCents + noShowCents };
}

function clampPercent(value: number): number {
  return Math.min(PERCENT, Math.max(0, value));
}
