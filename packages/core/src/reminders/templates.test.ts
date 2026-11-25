import { describe, expect, it } from 'vitest';
import { PlannedKind } from './plan.ts';
import { MessageTemplates, renderTemplate, templateFor, templateParams } from './templates.ts';

const facts = {
  serviceName: 'Sessão',
  startsAt: new Date('2027-01-04T12:00:00Z'),
  timezone: 'America/Sao_Paulo',
  address: 'Rua Exemplo, 100',
};

describe('templates', () => {
  it('fills the variables in the zone of the business', () => {
    expect(templateParams(facts)).toEqual(['Sessão', '04/01/2027', '09:00', 'Rua Exemplo, 100']);
    expect(renderTemplate(MessageTemplates.confirmation, templateParams(facts))).toBe(
      'Agendamento confirmado: Sessão em 04/01/2027 às 09:00. Local: Rua Exemplo, 100. Se precisar remarcar, é só responder aqui.',
    );
  });

  it('falls back to a generic place when the business has no address', () => {
    expect(templateParams({ ...facts, address: null })[3]).toBe('o endereço combinado');
  });

  it('allows a template for the confirmation and the first reminder only', () => {
    expect(templateFor(PlannedKind.confirmation, 0).templateAllowed).toBe(true);
    expect(templateFor(PlannedKind.reminder, 0).template).toBe(MessageTemplates.reminder);
    expect(templateFor(PlannedKind.reminder, 1).templateAllowed).toBe(false);
  });
});
