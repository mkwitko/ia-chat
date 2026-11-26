export const Route = {
  login: '/entrar',
  signUp: '/criar-conta',
  invite: '/convite/:token',
  forgotPassword: '/esqueci-a-senha',
  resetPassword: '/nova-senha',
  start: '/comecar',
  onboarding: '/configuracao',
  conversations: '/conversas',
  conversation: '/conversas/:id',
  agenda: '/agenda',
  agendaAvailability: '/agenda/disponibilidade',
  home: '/inicio',
  legacyToday: '/hoje',
  customers: '/clientes',
  customer: '/clientes/:id',
  results: '/resultados',
  more: '/mais',
  assistant: '/mais/assistente',
  tone: '/mais/assistente/tom',
  knowledge: '/mais/assistente/base',
  simulator: '/mais/assistente/simulador',
  services: '/mais/servicos',
  profile: '/mais/perfil',
  connections: '/mais/conexoes',
  usage: '/mais/plano-e-uso',
  billing: '/mais/assinatura',
  operator: '/operador',
} as const;

export const invitePath = (token: string) => `/convite/${token}`;
export const conversationPath = (id: string) => `${Route.conversations}/${id}`;
export const customerPath = (id: string) => `${Route.customers}/${id}`;
