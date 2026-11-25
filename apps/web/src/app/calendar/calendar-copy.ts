// Panel copy in pt-BR for the Google Agenda integration (E-21): second person, no jargon.

export const CalendarCopy = {
  heading: 'Google Agenda',
  intro:
    'Conecte sua agenda do Google para o assistente só oferecer horários em que você está livre e colocar cada atendimento marcado lá.',
  off: 'A conexão com o Google Agenda ainda não está disponível nesta conta.',
  loadFailed: 'Não conseguimos ver o estado do Google Agenda. Tente de novo.',
  connect: 'Conectar Google Agenda',
  reconnect: 'Reconectar Google Agenda',
  connecting: 'Abrindo o Google…',
  connectFailed: 'Não conseguimos abrir o Google. Tente de novo em instantes.',
  returnedOk: 'Google Agenda conectado. Escolha abaixo a agenda dos atendimentos.',
  returnedFailed: 'Não foi possível conectar. Confira se você autorizou todas as permissões.',
  connectedTo: (name: string) => `Conectado: ${name}`,
  chooseHeading: 'Escolha a agenda dos atendimentos',
  chooseHint:
    'Só aparecem agendas que são suas. O assistente consulta a disponibilidade dela e cria os atendimentos nela.',
  noCalendars:
    'Não encontramos uma agenda sua no Google. Crie uma (por exemplo, Atendimentos) e volte.',
  save: 'Usar esta agenda',
  saveFailed: 'Não conseguimos salvar a escolha. Tente de novo.',
  disconnect: 'Desconectar',
  disconnectConfirm:
    'Desconectar o Google Agenda? O assistente volta a usar só os horários cadastrados aqui. Os eventos já criados continuam no Google.',
  disconnected: 'Google Agenda desconectado.',
  needsReconnect:
    'A conexão com o Google Agenda caiu. Enquanto ela não voltar, o assistente não oferece horários e chama você.',
  bannerAction: 'Reconectar',
  waiting: 'Falta escolher a agenda. Até lá, o assistente não oferece horários e chama você.',
} as const;
