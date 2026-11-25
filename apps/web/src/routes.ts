export const Route = {
  login: '/entrar',
  conversations: '/conversas',
  conversation: '/conversas/:id',
  agenda: '/agenda',
  agendaAvailability: '/agenda/disponibilidade',
  today: '/hoje',
  more: '/mais',
  assistant: '/mais/assistente',
  tone: '/mais/assistente/tom',
  knowledge: '/mais/assistente/base',
  services: '/mais/servicos',
} as const;

export const conversationPath = (id: string) => `${Route.conversations}/${id}`;
