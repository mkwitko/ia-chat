import { describe, expect, it } from 'vitest';
import { cancellationText, hoursLines } from './hours.ts';

const at = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00Z`);

describe('hoursLines', () => {
  it('lists each open weekday, Monday first, with its windows in order', () => {
    expect(
      hoursLines([
        { weekday: 1, startTime: at('14:00'), endTime: at('18:00') },
        { weekday: 1, startTime: at('09:00'), endTime: at('12:00') },
        { weekday: 6, startTime: at('08:00'), endTime: at('12:00') },
        { weekday: 3, startTime: at('09:00'), endTime: at('12:00') },
      ]),
    ).toEqual([
      'Segunda: 09:00 às 12:00 e 14:00 às 18:00',
      'Quarta: 09:00 às 12:00',
      'Sábado: 08:00 às 12:00',
      'Nos outros dias não há atendimento.',
    ]);
  });

  it('says nothing when no rule exists (the assistant hands off instead of guessing)', () => {
    expect(hoursLines([])).toEqual([]);
  });
});

describe('cancellationText', () => {
  it('states the notice in hours or days', () => {
    expect(cancellationText(1440)).toBe(
      'Cancelamento ou remarcação com pelo menos 24 horas de antecedência.',
    );
    expect(cancellationText(120)).toBe(
      'Cancelamento ou remarcação com pelo menos 2 horas de antecedência.',
    );
    expect(cancellationText(0)).toBeUndefined();
  });
});
