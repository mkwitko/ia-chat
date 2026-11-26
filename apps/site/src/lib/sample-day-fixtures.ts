// The fictitious day drawn on the landing's day ruler (founder/landing-brief.md, section 2).
// Names and times are made up.

/** Treatment hours of the day (start hour of each one-hour session). */
export const SESSIONS = [8, 9, 10, 11, 14, 15, 16, 17] as const;

export const MISSED_MESSAGES = [
  {
    hour: 10,
    minute: 20,
    who: 'Marcos',
    text: 'Áudio · 0:38',
    note: 'Você está com um paciente. É alguém perguntando o preço.',
  },
  {
    hour: 14,
    minute: 5,
    who: 'Carla',
    text: 'Tem horário amanhã?',
    note: 'Você só vê às 18h, entre um atendimento e outro.',
  },
  {
    hour: 21,
    minute: 3,
    who: 'Bruno',
    text: 'Boa noite, vocês atendem sábado?',
    note: 'Depois do expediente. A resposta fica para amanhã.',
  },
] as const;

/**
 * The pilot's real first-visit service and price, used in the hero (owner authorization,
 * 26/11/2026, founder/piloto.md). Only the service and the price are real.
 */
export const PILOT_SERVICE = {
  name: 'Primeira consulta',
  detail: 'quiropraxia ou acupuntura',
  minutes: 60,
  priceCents: 25_000,
} as const;

/** The hero's booking: patient, words and times are made up. A 60-minute slot, 15:00 to 16:00. */
export const HERO_BOOKING = {
  patient: 'Joana',
  patientFull: 'Joana Souza',
  weekday: 'quinta',
  weekdayShort: 'qui.',
  start: '15:00',
  end: '16:00',
  alternative: '17:00',
} as const;
