// Panel copy in pt-BR for "Meu consultório" (owner, 26/11/2026): a summary of topics, each one
// opening a short editor. Written for someone who never used software like this.

const TITLE = 'Meu consultório';

export const ClinicCopy = {
  title: TITLE,
  intro: 'O que o assistente sabe sobre o seu consultório. Toque num item para mudar.',
  back: TITLE,
  business: 'Nome e apresentação',
  services: 'Serviços e preços',
  hours: 'Horários',
  address: 'Endereço',
  team: 'Quem atende',
  payments: 'Pagamento e desmarcação',
  calendar: 'Google Agenda',
  whatsapp: 'WhatsApp',
  missing: 'Falta preencher',
  loadFailed: 'Não conseguimos carregar agora. Toque para abrir.',
  noDescription: 'Falta contar o que você faz',
  noServices: 'Nenhum serviço ainda',
  serviceCount: (count: number) => (count === 1 ? '1 serviço' : `${String(count)} serviços`),
  packageCount: (count: number) => (count === 1 ? '1 pacote' : `${String(count)} pacotes`),
  noHours: 'Nenhum horário ainda',
  noAddress: 'Nenhum endereço ainda',
  moreAddresses: (count: number) => (count === 1 ? ' e mais 1' : ` e mais ${String(count)}`),
  professionalCount: (count: number) => `${String(count)} profissionais`,
  noPayments: 'Falta dizer como você recebe',
  noticeAnytime: 'desmarca a qualquer hora',
  notice: (amount: string) => `desmarca até ${amount} antes`,
  hoursAmount: (hours: number) => `${String(hours)}h`,
  minutesAmount: (minutes: number) => `${String(minutes)} min`,
  listJoin: ', ',
  connected: 'Conectado',
  connectedTo: (name: string) => `Conectado: ${name}`,
  notConnected: 'Não conectado',
  reconnect: 'A conexão caiu. Conecte de novo',
  chooseCalendar: 'Falta escolher a agenda',
  whatsappPending: 'Falta concluir a conexão',
  daysJoin: ' e ',
  daysRange: (first: string, last: string) => `${first} a ${last}`,
  hoursRange: (start: string, end: string) => `${start}–${end}`,
} as const;

export const StatusCopy = {
  done: 'Feito',
  todo: 'Falta configurar',
  optional: 'Opcional',
  edit: 'Editar',
  setUp: 'Configurar',
  open: 'Abrir',
  waiting: (count: number) => (count === 1 ? 'Falta 1 item' : `Faltam ${String(count)} itens`),
  allDone: 'Tudo pronto por aqui.',
} as const;

/** Short weekday names, Sunday first like `availability_rules.weekday`. */
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export const EditorCopy = {
  moreOptions: 'Mais opções',
  back: 'Voltar',
  businessIntro: 'O assistente usa isto para se apresentar aos pacientes.',
  servicesIntro: 'O assistente só informa o que está aqui, com o valor exato.',
  packagesHeading: 'Pacotes',
  packagesIntro: 'Várias sessões vendidas juntas, com um valor só. Opcional.',
  hoursIntro: 'Os dias e horas em que você atende. O assistente só marca dentro deles.',
  addressIntro: 'O assistente manda o endereço a quem marcar. O primeiro é o principal.',
  teamIntro: 'Quem atende os pacientes. Cada um tem os próprios horários.',
  paymentsIntro: 'O assistente conta isto a quem perguntar.',
  calendarIntro: 'Opcional. Com ele, o assistente vê seus compromissos e não marca por cima.',
  whatsappIntro: 'O número em que o assistente conversa com os pacientes.',
  qrHeading: 'Outra forma de conectar',
} as const;
