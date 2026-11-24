import { MessageType } from '@app/db';
import { describe, expect, it } from 'vitest';
import { prefilter, PrefilterKind } from './prefilter.ts';

const text = (value: string) => ({ type: MessageType.text, text: value });

describe('deterministic pre-filters (spec 04, "Fluxo de um turno")', () => {
  it('catches urgency in any message, with typos and without accents', () => {
    for (const message of [
      'to com dor no peito agora',
      'to com uma dor forte no peito agora',
      'muita falta de ar mesmo',
      'Estou com FALTA DE AR',
      'meu pai desmaiou',
      'acordei com a boca torta',
      'penso em acabar com tudo',
    ]) {
      expect(prefilter([text('oi'), text(message)], [])).toEqual({ kind: PrefilterKind.urgency });
    }
  });

  it('adds the specialty terms to the urgency list', () => {
    expect(
      prefilter(
        [text('travou a coluna e perdi a sensibilidade na perna')],
        ['perdi a sensibilidade'],
      ),
    ).toEqual({ kind: PrefilterKind.urgency });
  });

  it('does not take ordinary pain or hurry for urgency', () => {
    expect(prefilter([text('tenho dor nas costas faz uma semana')], [])).toEqual({
      kind: PrefilterKind.model,
    });
    expect(prefilter([text('preciso de horário urgente, viajo sexta')], [])).toEqual({
      kind: PrefilterKind.model,
    });
  });

  it('registers opt-out for a bare stop word or an explicit request', () => {
    expect(prefilter([text('SAIR')], [])).toEqual({ kind: PrefilterKind.optOut });
    expect(prefilter([text('não quero mais receber mensagem de vocês')], [])).toEqual({
      kind: PrefilterKind.optOut,
    });
    expect(prefilter([text('quero sair mais cedo do trabalho pra ir aí')], [])).toEqual({
      kind: PrefilterKind.model,
    });
  });

  it('ignores a lone sticker and asks to write when nothing is readable', () => {
    expect(prefilter([{ type: MessageType.sticker, text: null }], [])).toEqual({
      kind: PrefilterKind.ignore,
    });
    expect(prefilter([{ type: MessageType.unsupported, text: null }], [])).toEqual({
      kind: PrefilterKind.unsupported,
    });
    expect(prefilter([{ type: MessageType.sticker, text: null }, text('oi')], [])).toEqual({
      kind: PrefilterKind.model,
    });
  });
});
