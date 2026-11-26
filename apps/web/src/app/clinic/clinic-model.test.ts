import { describe, expect, it } from 'vitest';
import { LegacyRoute, Route } from '@/routes';
import { CalendarState } from '../calendar/calendar-api';
import { PaymentMethod } from '../profile/profile-api';
import {
  addressSummary,
  businessSummary,
  calendarSummary,
  hoursSummary,
  paymentsSummary,
  servicesSummary,
  TopicStatus,
} from './clinic-model';
import { redirectTarget } from './legacy-routes';

const rule = (weekday: number, start: string, end: string) => ({ weekday, start, end });
const DAY_MINUTES = 1440;

describe('settings summary', () => {
  it('reads the week as a range of days and the span of hours', () => {
    const rules = [rule(2, '07:00', '12:00'), rule(3, '14:00', '20:00'), rule(4, '07:30', '19:00')];
    expect(hoursSummary(rules)).toEqual({ value: 'Ter a Qui, 7h–20h', status: TopicStatus.done });
  });

  it('lists days that are not in a row', () => {
    const rules = [rule(1, '09:00', '18:00'), rule(3, '09:00', '18:00'), rule(5, '09:00', '18:30')];
    expect(hoursSummary(rules).value).toBe('Seg, Qua e Sex, 9h–18h30');
  });

  it('asks for what is missing', () => {
    expect(hoursSummary([]).status).toBe(TopicStatus.todo);
    expect(servicesSummary(0, 0).status).toBe(TopicStatus.todo);
    expect(addressSummary([]).status).toBe(TopicStatus.todo);
    expect(paymentsSummary([], DAY_MINUTES).status).toBe(TopicStatus.todo);
    expect(businessSummary('Consultório Teste', '').status).toBe(TopicStatus.todo);
  });

  it('says what is set in plain words', () => {
    expect(servicesSummary(2, 1).value).toBe('2 serviços, 1 pacote');
    expect(addressSummary(['Rua A, 10', 'Rua B, 20']).value).toBe('Rua A, 10 e mais 1');
    expect(paymentsSummary([PaymentMethod.pix, PaymentMethod.cash], DAY_MINUTES).value).toBe(
      'Pix, Dinheiro · desmarca até 24h antes',
    );
  });

  it('keeps the Google Agenda optional and hides it when it is off', () => {
    expect(calendarSummary({ state: CalendarState.off, calendarName: null })).toBeNull();
    const notConnected = { state: CalendarState.notConnected, calendarName: null };
    expect(calendarSummary(notConnected)?.status).toBe(TopicStatus.optional);
  });
});

describe('old settings addresses', () => {
  it('lead to the new place, keeping the query', () => {
    expect(redirectTarget(LegacyRoute.availability, '?profissional=abc')).toBe(
      `${Route.clinicHours}?profissional=abc`,
    );
    expect(redirectTarget(LegacyRoute.connections, '')).toBe(Route.clinicWhatsapp);
    expect(redirectTarget(LegacyRoute.profile, '')).toBe(Route.clinic);
  });
});
