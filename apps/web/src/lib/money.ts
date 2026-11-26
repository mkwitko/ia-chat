import { locale } from '@/i18n/locale';
// Money is whole cents everywhere (CLAUDE.md); the panel only formats and parses reais.

const CENTS_PER_REAL = 100;
const BRL = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' });
// "180", "180,50", "1.200,00", "R$ 180": digits, optional thousands dots, optional comma cents.
const REAIS = /^(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/;
const DOTS = /\./g;
const PAD = 2;

export function formatCents(cents: number): string {
  return BRL.format(cents / CENTS_PER_REAL);
}

/** Cents from what the professional typed, or null when it is not a price. */
export function parseReais(text: string): number | null {
  const match = REAIS.exec(text.trim());
  if (!match) return null;
  const [, reais = '0', cents = '0'] = match;
  return Number(reais.replace(DOTS, '')) * CENTS_PER_REAL + Number(cents.padEnd(PAD, '0'));
}

/** The editable form of a price: "180" or "180,50". */
export function centsToInput(cents: number): string {
  const reais = Math.trunc(cents / CENTS_PER_REAL);
  const rest = cents % CENTS_PER_REAL;
  return rest ? `${String(reais)},${String(rest).padStart(PAD, '0')}` : String(reais);
}
