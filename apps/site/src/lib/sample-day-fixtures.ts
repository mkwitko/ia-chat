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
