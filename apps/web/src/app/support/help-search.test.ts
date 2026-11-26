import { describe, expect, it } from 'vitest';
import { searchHelp, type HelpItem } from './help-search';

const item = (id: string, title: string, text = ''): HelpItem => ({
  id,
  title,
  summary: '',
  category: 'WhatsApp',
  text,
});

const index = [
  item('a', 'Conectar o WhatsApp', 'Passo a passo'),
  item('b', 'Franquia de conversas', 'Aviso aos 80%'),
  item('c', 'Configuração da agenda', 'Horários'),
];

describe('searchHelp', () => {
  it('ignores accents and case', () => {
    expect(searchHelp(index, 'CONFIGURACAO').map((i) => i.id)).toEqual(['c']);
  });

  it('requires every word and ranks title above body', () => {
    expect(searchHelp(index, 'whatsapp passo').map((i) => i.id)).toEqual(['a']);
    expect(
      searchHelp([item('x', 'Outro', 'conectar'), item('y', 'Conectar')], 'conectar')[0]?.id,
    ).toBe('y');
  });

  it('returns nothing for a blank query', () => {
    expect(searchHelp(index, '   ')).toEqual([]);
  });
});
