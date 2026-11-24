import { describe, expect, it } from 'vitest';
import { AgendaError, createAgenda, Period } from './agenda.ts';
import { NOW } from './data/clinic.ts';

const at = (iso: string) => new Date(`${iso}:00-03:00`);

describe('evaluation agenda', () => {
  it('offers free hourly slots after now, skipping busy ones', () => {
    const slots = createAgenda()
      .slots('avaliacao', NOW)
      .map((slot) => slot.toISOString());
    expect(slots[0]).toBe(at('2027-01-04T15:00').toISOString());
    expect(slots).not.toContain(at('2027-01-04T14:00').toISOString());
    expect(slots).toHaveLength(6);
  });

  it('filters by period', () => {
    const slots = createAgenda().slots('ajuste', at('2027-01-05T00:00'), Period.morning);
    expect(slots.map((slot) => slot.toISOString())).toEqual(
      [
        at('2027-01-05T11:00'),
        at('2027-01-06T10:00'),
        at('2027-01-06T11:00'),
        at('2027-01-07T08:00'),
        at('2027-01-07T09:00'),
        at('2027-01-07T10:00'),
      ].map((d) => d.toISOString()),
    );
  });

  it('rejects conflicts, closed hours and the past', () => {
    const agenda = createAgenda();
    expect(agenda.book('ajuste', at('2027-01-05T09:00')).error).toBe(AgendaError.slotTaken);
    expect(agenda.book('ajuste', at('2027-01-10T09:00')).error).toBe(AgendaError.outsideHours);
    expect(agenda.book('ajuste', at('2027-01-04T08:00')).error).toBe(AgendaError.inPast);
    expect(agenda.book('pacote', at('2027-01-07T09:00')).error).toBe(AgendaError.notBookable);
  });

  it('cancels and reschedules only with 24 hours notice', () => {
    const soon = createAgenda({ serviceId: 'ajuste', start: '2027-01-04T16:00:00-03:00' });
    expect(soon.cancel('meu-agendamento').error).toBe(AgendaError.tooLate);
    const later = createAgenda({ serviceId: 'ajuste', start: '2027-01-07T16:00:00-03:00' });
    const moved = later.reschedule('meu-agendamento', at('2027-01-08T09:00'));
    expect(moved.appointment).toMatchObject({ mine: true });
    expect(later.mine()).toHaveLength(1);
  });
});
