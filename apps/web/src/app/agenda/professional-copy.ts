// Panel copy in pt-BR for the agenda per professional (spec 10, "Agenda"; RN-56).

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const ProfessionalCopy = defineMessages({
  [Locale.ptBR]: {
    filterLabel: 'Profissional',
    all: 'Todos',
    servicesHeading: 'Serviços que atende',
    servicesIntro:
      'O assistente só oferece horários deste profissional para os serviços marcados aqui.',
    allServices: 'Todos os serviços',
    pickOne: 'Marque ao menos um serviço, ou volte para "Todos os serviços".',
    calendarElsewhere: (owner: string) =>
      `O Google Agenda conectado vale para a agenda de ${owner}. Para este profissional, o assistente usa só os horários e bloqueios desta página.`,
    hoursFor: (name: string) => `Horários de ${name}`,
    with: (name: string) => `com ${name}`,
  },
  [Locale.enUS]: {},
});
