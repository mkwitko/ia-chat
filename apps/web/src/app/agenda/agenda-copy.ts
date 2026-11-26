// Panel copy in pt-BR for the agenda (RN-56): second person, no software jargon.

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

const DAY_LABEL = 'Dia';

export const AgendaCopy = defineMessages({
  [Locale.ptBR]: {
    loadFailed: 'Não conseguimos carregar a agenda. Confira a conexão e tente de novo.',
    retry: 'Tentar de novo',
    today: 'Hoje',
    previous: 'Anterior',
    next: 'Próximo',
    viewLabel: 'Visão da agenda',
    day: DAY_LABEL,
    week: 'Semana',
    newBooking: 'Novo agendamento',
    settings: 'Horários e folgas',
    emptyDay: {
      title: 'Nenhum atendimento neste dia',
      body: 'Quando o assistente marcar uma consulta, ela aparece aqui. Você também pode marcar um paciente agora.',
    },
    emptyWeek: 'Nada marcado neste dia.',
    noPatient: 'Paciente sem nome',
    byAssistant: 'Marcado pelo assistente',
    byYou: 'Marcado por você',
    notSynced: 'Não sincronizado com o Google',
    vacation: 'Férias',
    block: 'Bloqueado',
    status: {
      scheduled: 'Agendado',
      confirmed: 'Confirmado',
      completed: 'Realizado',
      no_show: 'Faltou',
    },
    reschedule: 'Remarcar',
    cancel: 'Cancelar consulta',
    cancelled: 'Atendimento cancelado.',
    rescheduled: 'Atendimento remarcado.',
    booked: 'Atendimento marcado.',
    failed: 'Não conseguimos concluir. Tente de novo em instantes.',
    errors: {
      slot_taken: 'Esse horário acabou de ser ocupado. Escolha outro.',
      horario_indisponivel: 'Esse horário está fora da sua disponibilidade. Escolha outro.',
      limite_de_agendamentos: 'Esse paciente já tem o máximo de agendamentos futuros.',
      servico_nao_encontrado: 'Escolha um serviço da lista.',
      sem_profissional: 'Cadastre o profissional antes de agendar.',
      profissional_nao_encontrado: 'Esse profissional não faz este serviço. Escolha outro horário.',
      agenda_externa_indisponivel:
        'Não conseguimos consultar o seu Google Agenda agora. Nada foi marcado. Tente de novo ou reconecte em Disponibilidade.',
      agendamento_nao_sincronizado:
        'O horário ficou reservado aqui, mas o Google Agenda não aceitou o evento. Tente marcar de novo para completar.',
    },
  },
  [Locale.enUS]: {},
});

export const BookingCopy = defineMessages({
  [Locale.ptBR]: {
    titleNew: AgendaCopy.newBooking,
    titleMove: 'Remarcar atendimento',
    patient: 'Paciente',
    search: 'Buscar por nome ou telefone',
    noMatch: 'Ninguém encontrado. Cadastre como novo paciente.',
    newPatient: 'Novo paciente',
    existingPatient: 'Escolher paciente existente',
    name: 'Nome',
    phone: 'Telefone com DDD',
    phoneHint: 'É por ele que o assistente reconhece o paciente no WhatsApp.',
    service: 'Serviço',
    servicePlaceholder: 'Escolha o serviço',
    noServices: 'Cadastre um serviço em Mais > Serviços e local antes de agendar.',
    day: DAY_LABEL,
    slots: 'Horários livres',
    noSlots: 'Sem horários livres neste dia. Tente outro dia.',
    pickSlot: 'Escolha um horário.',
    loadingSlots: 'Buscando horários…',
    slotsFailed: 'Não conseguimos buscar os horários.',
    submit: 'Marcar',
    submitMove: 'Remarcar',
    submitting: 'Salvando…',
    close: 'Fechar',
  },
  [Locale.enUS]: {},
});

export const AvailabilityCopy = defineMessages({
  [Locale.ptBR]: {
    loadFailed: 'Não conseguimos carregar. Confira a conexão e tente de novo.',
    rulesHeading: 'Horários de atendimento',
    rulesIntro:
      'Os horários em que você atende por semana. O assistente só oferece o que está aqui.',
    weekdays: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    closed: 'Não atende',
    addWindow: 'Adicionar horário',
    removeWindow: 'Remover horário',
    from: 'Das',
    to: 'Às',
    toShort: 'às',
    invalidWindows:
      'Cada horário precisa terminar depois de começar, sem sobrepor outro do mesmo dia.',
    summaryHeading: 'Resumo da agenda de amanhã',
    summaryIntro:
      'Todo dia você recebe uma notificação com quantos atendimentos tem no dia seguinte.',
    summaryTime: 'Horário da notificação',
    offHeading: 'Bloqueios e férias',
    offIntro:
      'Feriados, compromissos e viagens. O assistente não oferece horários nesses períodos.',
    offEmpty: 'Nenhum bloqueio nem férias à vista.',
    addOff: 'Adicionar bloqueio ou férias',
    kind: 'Tipo',
    kindBlock: 'Bloqueio',
    kindVacation: 'Férias',
    fromDay: 'Primeiro dia',
    toDay: 'Último dia',
    fromTime: 'A partir de (opcional)',
    toTime: 'Até (opcional)',
    timesHint: 'Deixe em branco para bloquear os dias inteiros.',
    vacationHint:
      'Em férias o assistente avisa os pacientes da data em que você volta. A data vem daqui, ele não inventa.',
    reason: 'Motivo (só você vê)',
    reasonPlaceholder: 'Feriado, congresso…',
    removed: 'Período removido. Os horários voltam a ser oferecidos.',
    conflicts: (count: number) =>
      count === 1
        ? 'Atenção: 1 atendimento já marcado cai neste período. Ele não foi cancelado.'
        : `Atenção: ${String(count)} atendimentos já marcados caem neste período. Eles não foram cancelados.`,
    range: (from: string, to: string) => (from === to ? from : `${from} a ${to}`),
  },
  [Locale.enUS]: {},
});
