// Panel copy in pt-BR for Início (RN-56): second person, "assistente" never "bot".

export const HomeCopy = {
  title: 'Início',
  loadFailed: 'Não conseguimos carregar o início. Confira a conexão e tente de novo.',
  empty: {
    title: 'Seu consultório começa aqui',
    body: 'Quando os pacientes começarem a mandar mensagem no seu WhatsApp, você vê aqui os contatos do mês, o que precisa de você, os atendimentos de hoje e quem ainda não agendou.',
  },
  monthHeading: 'Este mês',
  counts: {
    contacts: 'Contatos no mês',
    booked: 'Agendamentos',
    awaiting: 'Aguardando retorno',
    cancelled: 'Cancelamentos',
  },
  attentionHeading: 'O que precisa de você',
  allClear: 'Tudo em dia. Nada esperando por você agora.',
  drafts: (count: number) =>
    count === 1 ? '1 rascunho para aprovar' : `${String(count)} rascunhos para aprovar`,
  unanswered: (count: number) =>
    count === 1
      ? '1 pergunta que o assistente não soube responder'
      : `${String(count)} perguntas que o assistente não soube responder`,
  toMarkHeading: 'Atendimentos para marcar presença',
  toConfirm: (count: number) =>
    count === 1
      ? '1 atendimento nas próximas 48 horas aguarda confirmação'
      : `${String(count)} atendimentos nas próximas 48 horas aguardam confirmação`,
  todayHeading: 'Hoje',
  todayEmpty: 'Nenhum atendimento marcado para hoje.',
  noPatient: 'Paciente sem nome',
  notBookedHeading: 'Não agendaram',
  notBookedCount: (count: number) =>
    count === 1
      ? '1 pessoa conversou e não agendou.'
      : `${String(count)} pessoas conversaram e não agendaram.`,
  recoverable: (count: number) =>
    count === 1 ? '1 pode ser retomada.' : `${String(count)} podem ser retomadas.`,
  recoverableHint:
    'Podem ser retomados: quem não pediu para parar e falou com você nos últimos 30 dias.',
  notBookedEmpty: 'Ninguém na fila de quem não agendou.',
  seeAllCustomers: 'Ver todos os clientes',
  resultsHeading: 'Resultados do mês',
  resultsBody: 'Conversas, agendamentos, faltas e tempo de resposta, com a conta de cada número.',
  seeResults: 'Ver resultados',
} as const;
