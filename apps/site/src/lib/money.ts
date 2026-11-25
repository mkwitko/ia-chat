const CENTS_PER_REAL = 100;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const integer = new Intl.NumberFormat('pt-BR');

/** "R$ 197,00" from integer cents. */
export function formatBrl(cents: number): string {
  return brl.format(cents / CENTS_PER_REAL);
}

export function formatCount(value: number): string {
  return integer.format(value);
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * CENTS_PER_REAL);
}
