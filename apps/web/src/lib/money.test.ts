import { describe, expect, it } from 'vitest';
import { centsToInput, parseReais } from './money';

describe('parseReais', () => {
  it('reads what the professional types', () => {
    expect(parseReais('180')).toBe(18000);
    expect(parseReais('180,5')).toBe(18050);
    expect(parseReais('R$ 1.200,00')).toBe(120000);
    expect(parseReais(' 0 ')).toBe(0);
  });

  it('refuses what is not a price', () => {
    expect(parseReais('')).toBeNull();
    expect(parseReais('cento e oitenta')).toBeNull();
    expect(parseReais('180.50')).toBeNull();
    expect(parseReais('-10')).toBeNull();
  });

  it('round-trips the editable form', () => {
    expect(centsToInput(18050)).toBe('180,50');
    expect(parseReais(centsToInput(18050))).toBe(18050);
    expect(centsToInput(18000)).toBe('180');
  });
});
