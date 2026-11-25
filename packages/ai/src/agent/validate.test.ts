import { Sensitivity } from '@app/core';
import { describe, expect, it } from 'vitest';
import {
  factsFromToolOutputs,
  timesIn,
  validateReply,
  Violation,
  type ReplyRules,
} from './validate.ts';

const rules = (overrides: Partial<ReplyRules> = {}): ReplyRules => ({
  catalogCents: [18_000, 65_000],
  pricesForbidden: false,
  sensitivity: Sensitivity.health,
  forbiddenTerms: ['cura', 'garantido'],
  allowedTimes: ['08:00', '12:00'],
  facts: { cents: [], times: [], actions: [] },
  ...overrides,
});

describe('output validation (spec 04, A-07)', () => {
  it('accepts catalog prices in any common format', () => {
    expect(validateReply('A avaliação custa R$ 180,00. O pacote, R$650.', rules())).toEqual([]);
    expect(validateReply('Fica R$ 180.', rules())).toEqual([]);
  });

  it('blocks a price that is not in the catalog nor from a tool (A-07)', () => {
    expect(validateReply('A sessão custa R$ 150,00.', rules())).toEqual([Violation.unknownPrice]);
    expect(validateReply('Cada sessão do pacote sai por R$ 130.', rules())).toEqual([
      Violation.unknownPrice,
    ]);
  });

  it('blocks any value when the specialty forbids prices (A-08)', () => {
    expect(validateReply('A avaliação custa R$ 180,00.', rules({ pricesForbidden: true }))).toEqual(
      [Violation.forbiddenPrice],
    );
    expect(validateReply('Fica uns 180 reais.', rules({ pricesForbidden: true }))).toEqual([
      Violation.forbiddenPrice,
    ]);
  });

  it('blocks times that came from no tool, appointment or opening hours', () => {
    expect(validateReply('Tenho quinta às 15h ou às 16:30.', rules())).toEqual([
      Violation.unknownTime,
    ]);
    const facts = { cents: [], times: ['15:00', '16:30'], actions: [] };
    expect(validateReply('Tenho quinta às 15h ou às 16:30.', rules({ facts }))).toEqual([]);
    expect(validateReply('Atendemos a partir das 8h.', rules())).toEqual([]);
  });

  it('blocks a booking, cancel or reschedule claim without the tool success (A-11)', () => {
    expect(validateReply('Prontinho, está agendado!', rules())).toEqual([
      Violation.unconfirmedAction,
    ]);
    expect(validateReply('Cancelei sua consulta.', rules())).toEqual([Violation.unconfirmedAction]);
    expect(validateReply('Posso agendar para você?', rules())).toEqual([]);
    expect(
      validateReply(
        'Prontinho, está agendado!',
        rules({ facts: { cents: [], times: [], actions: ['booked'] } }),
      ),
    ).toEqual([]);
  });

  it('blocks forbidden specialty terms and clinical conduct', () => {
    expect(validateReply('Com o tratamento a cura é garantida.', rules())).toEqual([
      Violation.forbiddenTerm,
    ]);
    expect(validateReply('Tome um relaxante muscular e faça compressa quente.', rules())).toEqual([
      Violation.clinicalConduct,
    ]);
  });

  it('applies the clinical conduct list only to health segments (M-02)', () => {
    const reply = 'Tome um relaxante muscular e faça compressa quente.';
    expect(validateReply(reply, rules({ sensitivity: Sensitivity.none }))).toEqual([]);
    expect(validateReply(reply, rules({ sensitivity: Sensitivity.health }))).toEqual([
      Violation.clinicalConduct,
    ]);
  });

  it('blocks empty, too long and system-looking answers', () => {
    expect(validateReply('   ', rules())).toEqual([Violation.empty]);
    expect(validateReply('a'.repeat(901), rules())).toEqual([Violation.tooLong]);
    expect(validateReply('<tool_call>{"x":1}</tool_call>', rules())).toEqual([
      Violation.systemMarkup,
    ]);
  });
});

describe('times the profile itself states', () => {
  it('reads times in any common format', () => {
    expect(
      timesIn(
        'Atendemos das 8h às 18h; sábado até 12:30. Chegue 10 min antes, 24 horas de antecedência.',
      ),
    ).toEqual(['08:00', '18:00', '12:30']);
  });
});

describe('facts from tool results', () => {
  it('collects times, money and successful actions from tool outputs', () => {
    const facts = factsFromToolOutputs([
      {
        tool: 'consultar_horarios',
        output: { horarios: [{ inicio: '2027-01-07T15:00:00-03:00' }] },
      },
      {
        tool: 'agendar',
        output: {
          agendamento: 'ag-1',
          inicio: '2027-01-07T15:00:00-03:00',
          valor_centavos: 18_000,
        },
      },
      { tool: 'cancelar', output: { erro: 'too_late' } },
    ]);
    expect(facts).toEqual({ cents: [18_000], times: ['15:00'], actions: ['booked'] });
  });
});
