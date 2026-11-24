import { TIME_ZONE } from './data/clinic.ts';

const SLOT_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** "terça-feira, 05/01, 15:00" in the clinic's time zone. */
export function formatSlot(date: Date): string {
  return SLOT_FORMAT.format(date);
}

const CENTS_PER_REAL = 100;
const MONEY_DECIMALS = 2;

export function formatCents(cents: number): string {
  return `R$ ${(cents / CENTS_PER_REAL).toFixed(MONEY_DECIMALS).replace('.', ',')}`;
}
