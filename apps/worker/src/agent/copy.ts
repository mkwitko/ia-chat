// Fixed messages sent without a model (spec 04, pre-filters and limits). pt-BR, short.

/** tenants.assistant_name default (schema): reads as a role, not a name. */
export const DEFAULT_ASSISTANT_NAME = 'Assistente virtual';

export const AgentCopy = {
  emergency:
    'Se for uma emergência, ligue agora para o SAMU no 192 ou vá ao pronto-socorro mais próximo. Se estiver em sofrimento emocional, o CVV atende 24 horas no 188. Já avisei o profissional.',
  optOutConfirmation:
    'Pronto, você não vai mais receber mensagens automáticas daqui. Se precisar de algo, é só escrever.',
  unsupported: 'Não consegui abrir essa mensagem. Pode escrever em texto, por favor?',
  away: 'Recebemos sua mensagem. O profissional vai responder assim que puder.',
  identification: (assistant: string, professional: string) =>
    assistant === DEFAULT_ASSISTANT_NAME
      ? `Oi! Sou a assistente virtual do consultório de ${professional}.`
      : `Oi! Aqui é ${assistant}, assistente virtual do consultório de ${professional}.`,
} as const;
