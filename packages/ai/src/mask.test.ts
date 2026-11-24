import { describe, expect, it } from 'vitest';
import { maskPersonalData } from './mask.ts';

describe('maskPersonalData', () => {
  it('masks Brazilian phone numbers in any common format', () => {
    for (const phone of ['+55 11 90000-0001', '(11) 90000-0001', '11900000001', '+5511900000001']) {
      expect(maskPersonalData(`ligue ${phone} hoje`, [])).toBe('ligue [telefone] hoje');
    }
  });

  it('masks the known names of the contact, ignoring case', () => {
    expect(maskPersonalData('Oi Maria Exemplo, tudo bem? maria', ['Maria Exemplo', 'Maria'])).toBe(
      'Oi [nome], tudo bem? [nome]',
    );
  });

  it('masks a name only as a whole word, accents included', () => {
    expect(maskPersonalData('Ana marcou para a semana; Ána não', ['Ana'])).toBe(
      '[nome] marcou para a semana; Ána não',
    );
  });

  it('keeps times, prices and dates readable', () => {
    const text = 'Sessão às 14:30 de 04/01/2027 custa R$ 180,00';
    expect(maskPersonalData(text, [])).toBe(text);
  });
});
