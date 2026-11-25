import { Identity } from '@app/ai';

// Fixed messages sent without a model (spec 04, pre-filters and limits), per identity
// mode (owner decision, 24/11/2026). pt-BR, short.

/** tenants.assistant_name default (schema): reads as a role, not a name. */
export const DEFAULT_ASSISTANT_NAME = 'Assistente virtual';

const EMERGENCY =
  'Já avisei o profissional. Se for uma emergência, ligue agora para o SAMU no 192 ou vá ao pronto-socorro mais próximo. Se estiver em sofrimento emocional, o CVV atende 24 horas no 188.';
const NOTICE =
  'Vou passar sua mensagem para o profissional, que vai te responder por aqui assim que puder.';

export interface Persona {
  identity: Identity;
  assistantName: string;
  professionalName: string;
}

export const AgentCopy = {
  /** Says the professional was told: the push notice (E-16) goes out with this answer. */
  emergency: EMERGENCY,
  handoffNotice: ({ identity }: Persona) =>
    identity === Identity.professional
      ? 'Vou te responder com calma por aqui assim que puder.'
      : NOTICE,
  away: ({ identity }: Persona) =>
    identity === Identity.professional
      ? 'Recebi sua mensagem e respondo assim que puder.'
      : 'Recebemos sua mensagem. O profissional vai responder assim que puder.',
  optOutConfirmation:
    'Pronto, você não vai mais receber mensagens automáticas daqui. Se precisar de algo, é só escrever.',
  /** Fixed text for the model to relay (RF-14); the date is computed, never written by the model. */
  vacation: (returnDate: string) =>
    `O consultório está de férias e volta a atender em ${returnDate}. Avise o paciente dessa data e só ofereça horários a partir dela.`,
  unsupported: 'Não consegui abrir essa mensagem. Pode escrever em texto, por favor?',
  /** First answer of a conversation; null in the professional mode (it speaks as them). */
  identification: ({ identity, assistantName, professionalName }: Persona): string | null => {
    if (identity === Identity.professional) return null;
    if (identity === Identity.clinic) return `Oi! Aqui é do consultório de ${professionalName}.`;
    return assistantName === DEFAULT_ASSISTANT_NAME
      ? `Oi! Sou a assistente virtual do consultório de ${professionalName}.`
      : `Oi! Aqui é ${assistantName}, assistente virtual do consultório de ${professionalName}.`;
  },
} as const;
