export const Route = {
  login: '/entrar',
  signUp: '/criar-conta',
  forgotPassword: '/esqueci-a-senha',
  resetPassword: '/nova-senha',
  start: '/comecar',
  onboarding: '/configuracao',
  conversations: '/conversas',
  conversation: '/conversas/:id',
  agenda: '/agenda',
  agendaAvailability: '/agenda/disponibilidade',
  today: '/hoje',
  more: '/mais',
  assistant: '/mais/assistente',
  tone: '/mais/assistente/tom',
  knowledge: '/mais/assistente/base',
  simulator: '/mais/assistente/simulador',
  services: '/mais/servicos',
  usage: '/mais/plano-e-uso',
  operator: '/operador',
} as const;

export const conversationPath = (id: string) => `${Route.conversations}/${id}`;
