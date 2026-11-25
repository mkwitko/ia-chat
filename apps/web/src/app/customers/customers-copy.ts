// Panel copy in pt-BR for Clientes (RN-56). No free-text note or complaint field exists here
// on purpose: the assistant and the panel keep no health information.

export const CustomersCopy = {
  title: 'Clientes',
  loadFailed: 'Não conseguimos carregar os clientes. Confira a conexão e tente de novo.',
  searchLabel: 'Buscar por nome ou telefone',
  filterLabel: 'Filtrar por status',
  filterAll: 'Todos',
  emptyFilter: 'Ninguém encontrado com esses filtros.',
  empty: {
    title: 'Nenhum cliente ainda',
    body: 'Os contatos aparecem aqui quando alguém mandar mensagem no seu WhatsApp. Cada pessoa vira um cliente, e o status muda sozinho conforme ela conversa e agenda.',
  },
  noName: 'Sem nome',
  lastContact: 'Último contato',
  nextAppointment: 'Próximo atendimento',
  optedOut: 'Pediu para parar',
  attendedCount: (count: number) =>
    count === 1 ? '1 atendimento' : `${String(count)} atendimentos`,
} as const;

export const CustomerCopy = {
  back: 'Clientes',
  loadFailed: 'Não conseguimos carregar este cliente. Confira a conexão e tente de novo.',
  notFound: 'Cliente não encontrado.',
  openConversation: 'Abrir conversa',
  autoStatus:
    'O status muda sozinho conforme as mensagens e os atendimentos. Você só precisa marcar à mão quando alguém desistir.',
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
  } as Record<string, string>,
  attendanceFailed: 'Não conseguimos registrar. Tente de novo em instantes.',
  consentHeading: 'Consentimento',
  consentEmpty: 'Nenhum registro de consentimento ainda.',
  consentCategory: (category: string) => `para ${category}`,
  recordOptOut: 'Registrar que pediu para parar',
  optedOutNote:
    'Esta pessoa pediu para parar. Só ela pode voltar a receber mensagens, escrevendo "voltar" no WhatsApp.',
  optOutConfirm:
    'Registrar que esta pessoa pediu para parar? O assistente deixa de mandar mensagens por iniciativa própria.',
  consentSaved: 'Consentimento registrado.',
  stageHeading: 'Histórico do status',
  stageEmpty: 'O status ainda não mudou.',
  stageAutomatic: 'automático',
  stageManual: 'manual',
  stageFirst: 'Primeiro status',
  stageChange: (from: string, to: string) => `${from} para ${to}`,
  lostHeading: 'Perdeu este cliente?',
  lostReason: 'Motivo',
  lostPlaceholder: 'Escolha o motivo',
  markLost: 'Marcar como perdido',
  lostSaved: 'Marcado como perdido.',
  backToAuto: 'Voltar ao status automático',
  autoSaved: 'Status automático de volta.',
  failed: 'Não conseguimos salvar. Tente de novo em instantes.',
} as const;
