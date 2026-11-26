import { describe, expect, it } from 'vitest';
import { Locale } from './locale';
import { defineMessages } from './messages';

const resources = {
  [Locale.ptBR]: {
    title: 'Início',
    nested: { save: 'Salvar', count: (n: number) => `${String(n)} itens` },
  },
  [Locale.enUS]: { nested: { save: 'Save' } },
} as const;

describe('defineMessages', () => {
  it('returns pt-BR as is', () => {
    expect(defineMessages(resources, Locale.ptBR).nested.save).toBe('Salvar');
  });

  it('uses the translation and falls back to pt-BR key by key', () => {
    const en = defineMessages(resources, Locale.enUS);
    expect(en.nested.save).toBe('Save');
    expect(en.title).toBe('Início');
    expect(en.nested.count(2)).toBe('2 itens');
  });
});
