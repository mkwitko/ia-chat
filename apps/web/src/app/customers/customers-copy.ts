// Panel copy in pt-BR for Clientes (RN-56). No free-text note or complaint field exists here
// on purpose: the assistant and the panel keep no health information.

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const CustomersCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Clientes',
    hint: 'Aqui ficam todas as pessoas que falaram com o seu WhatsApp. Procure pelo nome ou telefone, ou toque numa situação para filtrar.',
    loadFailed: 'Não conseguimos carregar os clientes.',
    searchLabel: 'Buscar por nome ou telefone',
    filterLabel: 'Filtrar por situação',
    filterAll: 'Todos',
    emptyFilter: 'Ninguém encontrado com esses filtros.',
    empty: {
      title: 'Nenhum cliente ainda',
      body: 'Os contatos aparecem aqui quando alguém mandar mensagem no seu WhatsApp. Cada pessoa vira um cliente, e a situação muda sozinha conforme ela conversa e agenda.',
    },
    noName: 'Sem nome',
    lastContact: 'Último contato',
    nextAppointment: 'Próximo atendimento',
    optedOut: 'Pediu para parar',
    attendedCount: (count: number) =>
      count === 1 ? '1 atendimento' : `${String(count)} atendimentos`,
  },
  [Locale.enUS]: {},
});

export const CustomerCopy = defineMessages({
  [Locale.ptBR]: {
    back: 'Clientes',
    loadFailed: 'Não conseguimos carregar este cliente.',
    notFound: 'Cliente não encontrado.',
    openConversation: 'Abrir a conversa',
    moreLabel: 'Origem, pedido para parar e situação',
    autoStatus:
      'A situação muda sozinha conforme as mensagens e os atendimentos. Você só precisa marcar à mão quando alguém desistir.',
    originHeading: 'Origem',
    originLabel: 'Como chegou até você',
    originRefLabel: 'Código da indicação',
    originRefHint: 'Opcional. Anote o código ou o nome de quem indicou.',
    originSave: 'Salvar origem',
    originSaved: 'Origem salva.',
    appointmentsHeading: 'Atendimentos',
    appointmentsEmpty: 'Nenhum atendimento marcado com esta pessoa.',
    attended: 'Compareceu',
    noShow: 'Faltou',
    attendanceAsk: 'Como foi este atendimento?',
    attendanceSaved: 'Presença registrada.',
    attendanceErrors: {
      atendimento_nao_comecou: 'Esse atendimento ainda não começou.',
      presenca_indisponivel: 'Não dá para marcar presença neste atendimento.',
    },
    attendanceFailed: 'Não conseguimos registrar. Tente de novo em instantes.',
    consentHeading: 'Pedido para parar',
    consentEmpty: 'Esta pessoa não pediu para parar.',
    consentCategory: (category: string) => `para ${category}`,
    recordOptOut: 'Registrar que pediu para parar',
    optedOutNote:
      'Esta pessoa pediu para parar. Só ela pode voltar a receber mensagens, escrevendo "voltar" no WhatsApp.',
    optOutConfirm:
      'Registrar que esta pessoa pediu para parar? O assistente deixa de mandar mensagens por iniciativa própria.',
    consentSaved: 'Pedido registrado.',
    optOutAction: 'Registrar o pedido',
    stageHeading: 'Histórico da situação',
    stageEmpty: 'A situação ainda não mudou.',
    stageAutomatic: 'automático',
    stageManual: 'manual',
    stageFirst: 'Primeira situação',
    stageChange: (from: string, to: string) => `${from} para ${to}`,
    lostHeading: 'Perdeu este cliente?',
    lostReason: 'Motivo',
    lostPlaceholder: 'Escolha o motivo',
    markLost: 'Marcar como perdido',
    lostSaved: 'Marcado como perdido.',
    backToAuto: 'Voltar à situação automática',
    autoSaved: 'Situação automática de volta.',
    failed: 'Não conseguimos salvar. Tente de novo em instantes.',
  },
  [Locale.enUS]: {},
});
