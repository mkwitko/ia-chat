import { describe, expect, it } from 'vitest';
import { buildSearchIndex, searchHelp, stripMarkdown } from './help-search.ts';

const index = buildSearchIndex([
  {
    id: 'passo-ativacao',
    title: 'Passo 8: ativação',
    summary: 'O que acontece quando você ativa o assistente.',
    category: 'Começar',
    body: 'Ao ativar, o assistente começa em **"aprovar antes de enviar"**.',
  },
  {
    id: 'aviso-franquia-80',
    title: 'Aviso: você usou 80% das conversas',
    summary: 'O que significa o aviso.',
    category: 'Avisos do painel',
    body: 'Defina um [teto de excedente](/ajuda/teto-de-excedente) para controlar o gasto.',
  },
]);

describe('help search', () => {
  it('strips markdown marks and link targets', () => {
    expect(stripMarkdown('## Oi\n[teto](/ajuda/x) **forte**')).toBe('Oi teto forte');
  });

  it('ignores accents and case', () => {
    expect(searchHelp(index, 'ATIVACAO').map((i) => i.id)).toEqual(['passo-ativacao']);
  });

  it('finds words in the body, not in link targets', () => {
    expect(searchHelp(index, 'excedente').map((i) => i.id)).toEqual(['aviso-franquia-80']);
    expect(searchHelp(index, 'ajuda')).toEqual([]);
  });

  it('requires every word and returns nothing for an empty query', () => {
    expect(searchHelp(index, 'ativacao franquia')).toEqual([]);
    expect(searchHelp(index, '  ')).toEqual([]);
  });
});
