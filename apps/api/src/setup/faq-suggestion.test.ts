import { describe, expect, it } from 'vitest';
import { PROFILE_NOTE, checkedSuggestion } from './faq-suggestion.ts';

describe('checkedSuggestion', () => {
  it('keeps a plain answer', () => {
    expect(checkedSuggestion('Sim, aceitamos cartão de débito e crédito.')).toBe(
      'Sim, aceitamos cartão de débito e crédito.',
    );
  });

  it.each([
    'A consulta custa R$ 250.',
    'Custa 250 reais.',
    'Atendemos às 14h.',
    'Atendemos às 14:30 de terça.',
    'A sessão dura 45 minutos.',
  ])('replaces an answer that states a price or a time: %s', (text) => {
    expect(checkedSuggestion(text)).toBe(PROFILE_NOTE);
  });

  it('replaces an empty answer', () => {
    expect(checkedSuggestion('  ')).toBe(PROFILE_NOTE);
  });
});
