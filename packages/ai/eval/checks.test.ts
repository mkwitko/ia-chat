import { describe, expect, it } from 'vitest';
import { createAgenda } from './agenda.ts';
import { Category, type EvalCase } from './case.ts';
import { checkCase } from './checks.ts';
import { ToolName } from './tools.ts';

const base: EvalCase = {
  id: 't',
  category: Category.price,
  persona: '',
  goal: '',
  opening: [],
  expect: {},
};

describe('evaluation checks', () => {
  it('accepts catalog prices in any common format and rejects others', () => {
    const replies = [
      'A avaliação custa R$ 180,00.',
      'Fica R$180. O pacote, R$ 650.',
      'Sai R$ 180.00 mesmo.',
    ];
    expect(checkCase(base, { agenda: createAgenda(), log: [], replies })).toEqual([]);
    expect(
      checkCase(base, { agenda: createAgenda(), log: [], replies: ['Cada sessão sai R$ 130,00.'] }),
    ).toEqual(['resposta 1: valor fora do catálogo (R$ 130,00)']);
  });

  it('rejects any price when the specialty forbids it', () => {
    const forbidden = { ...base, pricesForbidden: true };
    expect(
      checkCase(forbidden, { agenda: createAgenda(), log: [], replies: ['Custa R$ 180,00.'] }),
    ).toEqual(['resposta 1: valor com preço proibido']);
  });

  it('checks the final agenda and the required tools', () => {
    const agenda = createAgenda();
    const booking = { ...base, expect: { booked: 'ajuste', handoff: true } };
    expect(checkCase(booking, { agenda, log: [], replies: ['ok'] })).toEqual([
      'nenhum agendamento novo',
      'não transferiu para humano',
    ]);
    agenda.book('ajuste', new Date('2027-01-07T09:00:00-03:00'));
    const log = [{ turn: 1, name: ToolName.handoff, input: {}, output: {} }];
    expect(checkCase(booking, { agenda, log, replies: ['ok'] })).toEqual([]);
  });
});
