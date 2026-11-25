export const Route = {
  login: '/entrar',
  signUp: '/criar-conta',
  forgotPassword: '/esqueci-a-senha',
  resetPassword: '/nova-senha',
  start: '/comecar',
  conversations: '/conversas',
  conversation: '/conversas/:id',
  agenda: '/agenda',
  today: '/hoje',
  more: '/mais',
  assistant: '/mais/assistente',
  tone: '/mais/assistente/tom',
  knowledge: '/mais/assistente/base',
  services: '/mais/servicos',
  usage: '/mais/plano-e-uso',
} as const;

export const conversationPath = (id: string) => `${Route.conversations}/${id}`;
