// Panel copy in pt-BR for "dinheiro recuperado" (research 09 #1). An estimate from the owner's
// own price list, labelled as such; never a promise of gain (RF-71).

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

const DAY_MONTH = /^\d{4}-(\d{2})-(\d{2})$/;

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

export const RecoveredCopy = defineMessages({
  [Locale.ptBR]: {
    homeTitle: 'Recuperado este mês',
    resultsTitle: 'Dinheiro recuperado',
    noData: 'Ainda sem dados',
    basis: (count: number) =>
      `${plural(count, 'atendimento agendado', 'atendimentos agendados')} pelo assistente e marcados como "Compareceu".`,
    missing: (count: number, min: number) =>
      `O valor aparece a partir de ${String(min)} atendimentos agendados pelo assistente e marcados como "Compareceu". Até agora: ${String(count)}.`,
    afterHours: (count: number) =>
      `${plural(count, 'deles foi agendado', 'deles foram agendados')} com o consultório fechado.`,
    howTitle: 'Como calculamos',
    how: 'Somamos o preço do serviço de cada atendimento que o assistente agendou e que você marcou como "Compareceu". Faltas, cancelamentos e atendimentos sem presença marcada ficam de fora. É uma estimativa pela sua tabela de preços, não um valor recebido.',
    howAfterHours:
      'Com o consultório fechado: o assistente fez o agendamento fora dos horários de atendimento da sua agenda.',
    weeksTitle: 'Por semana',
    week: (day: string) => `Semana de ${day.replace(DAY_MONTH, '$2/$1')}`,
    weekCount: (count: number) => plural(count, 'atendimento', 'atendimentos'),
    weeksEmpty: 'Nenhum atendimento agendado pelo assistente com presença marcada neste período.',
  },
  [Locale.enUS]: {},
});
