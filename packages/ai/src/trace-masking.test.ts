import { describe, expect, it } from 'vitest';
import { createTraceMasker, genAiMaskingProcessor } from './trace-masking.ts';

const TEN_MINUTES_MS = 600_000;

describe('trace masker', () => {
  it('masks remembered names and phones in strings and nested values', () => {
    const masker = createTraceMasker(() => 0);
    masker.remember(['Maria Exemplo']);
    const data = { messages: [{ content: 'Maria Exemplo, 11900000001' }], tokens: 3 };
    expect(masker.mask({ data })).toEqual({
      messages: [{ content: '[nome], [telefone]' }],
      tokens: 3,
    });
  });

  it('forgets a name after ten minutes', () => {
    let now = 0;
    const masker = createTraceMasker(() => now);
    masker.remember(['Maria']);
    now = TEN_MINUTES_MS + 1;
    expect(masker.mask({ data: 'Maria' })).toBe('Maria');
  });

  it('masks each part of a name, so a first name alone is masked too', () => {
    const masker = createTraceMasker(() => 0);
    masker.remember(['Joana da Silva']);
    expect(masker.mask({ data: 'Olá, Joana! Silva, da sala 2' })).toBe(
      'Olá, [nome]! [nome], da sala 2',
    );
  });

  it('masks the raw gen_ai attributes of AI SDK spans before export', () => {
    const masker = createTraceMasker(() => 0);
    masker.remember(['Joana']);
    const span = {
      attributes: {
        'gen_ai.input.messages': '[{"content":"Sou Joana, 11900000001"}]',
        'gen_ai.usage.input_tokens': 48,
        'other.attribute': 'Joana',
      },
    };
    genAiMaskingProcessor(masker).onEnd(span as never);
    expect(span.attributes).toEqual({
      'gen_ai.input.messages': '[{"content":"Sou [nome], [telefone]"}]',
      'gen_ai.usage.input_tokens': 48,
      'other.attribute': 'Joana',
    });
  });
});
