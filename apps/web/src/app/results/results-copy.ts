// Panel copy in pt-BR for Resultados (RN-56). Every number comes with its formula.

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const ResultsCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Resultados',
    mainTitle: 'O principal',
    allNumbers: 'Ver todos os números',
    back: 'Início',
    hint: 'Como foi o atendimento no período escolhido. Cada número tem "Como calculamos" com a conta por trás.',
    loadFailed: 'Não conseguimos carregar os resultados.',
    periodLabel: 'Período',
    periods: { month: 'Este mês', last_month: 'Mês passado', last_90_days: 'Últimos 90 dias' },
    insufficient: 'Sem dados suficientes',
    insufficientCounts: (part: number, total: number) => `${String(part)} de ${String(total)}`,
    formulaLabel: 'Como é calculado',
    conversations: {
      title: 'Conversas',
      formula: 'Pessoas diferentes que conversaram com você no período.',
    },
    newContacts: {
      title: 'Contatos novos',
      formula: 'Pessoas que mandaram a primeira mensagem no período.',
    },
    firstResponse: {
      title: 'Tempo até a primeira resposta',
      formula: 'Mediana do tempo entre a primeira mensagem do paciente e a primeira resposta.',
      sample: (count: number) => `Calculado sobre ${String(count)} conversas.`,
    },
    escalation: {
      title: 'Conversas que passaram para você',
      formula: 'Conversas em que o assistente passou para você, dividido por todas as conversas.',
    },
    booked: {
      title: 'Agendamentos feitos',
      formula:
        'Atendimentos novos marcados no período, por você ou pelo assistente. Remarcações contam à parte.',
    },
    rescheduled: {
      title: 'Remarcações',
      formula: 'Atendimentos cancelados ou movidos que o cliente marcou de novo no período.',
    },
    cancelled: {
      title: 'Cancelamentos',
      formula: 'Atendimentos cancelados no período que não foram remarcados.',
    },
    noShow: {
      title: 'Faltas',
      formula: 'Faltas dividido por (comparecimentos + faltas) entre os atendimentos já marcados.',
      unmarked: (count: number) =>
        count === 1
          ? '1 atendimento sem presença marcada.'
          : `${String(count)} atendimentos sem presença marcada.`,
    },
    recovered: {
      title: 'Contatos retomados',
      formula: 'Pessoas que tinham parado de responder, voltaram a conversar e agendaram.',
    },
    repeatBookings: {
      title: 'Agendamentos de quem já era cliente',
      formula: 'Agendamentos feitos por pessoas que já tinham comparecido antes.',
    },
    originTitle: 'De onde vêm os contatos',
    originFormula: 'Contatos novos do período, agrupados pela origem.',
    originEmpty: 'Nenhum contato novo neste período.',
    referrals: { title: 'Indicações', formula: 'Contatos novos que chegaram por indicação.' },
    baseline: (since: string) =>
      `Esses números começam em ${since}. Para comparar com antes do assistente, anote hoje quantas faltas e quantos pacientes novos você tem por mês.`,
    baselineNoDate:
      'Esses números começam quando o assistente passou a atender. Para comparar com antes dele, anote hoje quantas faltas e quantos pacientes novos você tem por mês.',
    requestsNote: 'Pedidos de agendamento que não viraram horário marcado não são medidos.',
  },
  [Locale.enUS]: {},
});
