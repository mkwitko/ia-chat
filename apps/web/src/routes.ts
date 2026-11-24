export const Route = {
  login: '/entrar',
  conversations: '/conversas',
  conversation: '/conversas/:id',
  agenda: '/agenda',
  today: '/hoje',
  more: '/mais',
  assistant: '/mais/assistente',
} as const;

export const conversationPath = (id: string) => `${Route.conversations}/${id}`;
