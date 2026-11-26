// Panel copy in pt-BR for Resultados (RN-56). Plain sentences under each number; the formulas
// live together in "Como calculamos" at the end of the page (round 3).

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const ResultsCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Resultados',
    mainTitle: 'O principal',
    allNumbers: 'Ver todos os números',
    back: 'Início',
    hint: 'Como foi o atendimento no período escolhido. A conta de cada número fica em "Como calculamos", no fim da página.',
    loadFailed: 'Não conseguimos carregar os resultados.',
    periodLabel: 'Período',
    periods: { month: 'Este mês', last_month: 'Mês passado', last_90_days: 'Últimos 90 dias' },
    insufficient: 'Ainda poucos dados',
    howTitle: 'Como calculamos',
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
      formula:
        'Quanto a pessoa espera, em geral, entre a primeira mensagem e a primeira resposta: metade das conversas é respondida mais rápido que isso.',
      sample: (count: number) =>
        count === 1 ? 'Só 1 conversa até agora.' : `Só ${String(count)} conversas até agora.`,
    },
    escalation: {
      title: 'Conversas que passaram para você',
      formula: 'De todas as conversas, quantas o assistente passou para você responder.',
      counts: (part: number, total: number) =>
        `${String(part)} de ${String(total)} conversas passaram para você.`,
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
      formula:
        'Dos atendimentos em que você marcou se a pessoa veio, quantos tiveram falta. Os que ainda não foram marcados ficam de fora.',
      counts: (noShow: number, total: number) => {
        if (total === 0) return 'Você ainda não marcou se as pessoas vieram.';
        if (noShow === 0) return `Ninguém faltou nos ${String(total)} atendimentos marcados.`;
        return `${String(noShow)} de ${String(total)} pessoas faltaram.`;
      },
      unmarked: (count: number) =>
        count === 1
          ? 'Falta marcar se 1 pessoa veio.'
          : `Falta marcar se ${String(count)} pessoas vieram.`,
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
