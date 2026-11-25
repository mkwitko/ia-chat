const LOCALE = 'pt-BR';

/** "novembro de 2026" for the first day of a month (UTC). */
export function monthLabel(month: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(month);
}
