const CENTS_PER_REAL = 100;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const integer = new Intl.NumberFormat('pt-BR');

/** "R$ 197,00" from integer cents. */
export function formatBrl(cents: number): string {
  return brl.format(cents / CENTS_PER_REAL);
}

/** "R$ 297" for whole reais, "R$ 0,40" otherwise: for display next to large numbers. */
export function formatBrlShort(cents: number): string {
  const full = formatBrl(cents);
  return cents % CENTS_PER_REAL === 0 ? full.replace(/,00$/, '') : full;
}

export function formatCount(value: number): string {
  return integer.format(value);
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * CENTS_PER_REAL);
}
