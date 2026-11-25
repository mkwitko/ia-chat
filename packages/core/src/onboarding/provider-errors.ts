// RF-85: Meta and Google errors in plain language, with what to do.
// Codes are the ones in the providers' public error lists (WhatsApp Cloud API "Error codes",
// Google OAuth 2.0 and Calendar API errors). Anything else gets the generic message per provider.

export const Provider = { meta: 'meta', google: 'google' } as const;
export type Provider = (typeof Provider)[keyof typeof Provider];

export interface FriendlyError {
  message: string;
  action: string;
}

const TRY_AGAIN = 'Tente de novo. Se continuar, fale com a gente pelo botão "preciso de ajuda".';

const RETRY_LATER: FriendlyError = {
  message: 'O serviço está com muita demanda agora.',
  action: 'Espere alguns minutos e tente de novo.',
};
const RECONNECT: FriendlyError = {
  message: 'A autorização expirou ou foi cancelada.',
  action: 'Conecte a conta de novo, aceitando todas as permissões pedidas.',
};
const PERMISSION: FriendlyError = {
  message: 'Faltou uma permissão para concluir a conexão.',
  action: 'Refaça a conexão e aceite todas as permissões que aparecem na tela.',
};
const PAYMENT: FriendlyError = {
  message: 'A Meta não encontrou uma forma de pagamento válida na sua conta.',
  action: 'Cadastre ou corrija o cartão no Gerenciador de Negócios da Meta e tente de novo.',
};

export const GENERIC_ERRORS: Record<Provider, FriendlyError> = {
  meta: {
    message: 'A Meta recusou a operação.',
    action: TRY_AGAIN,
  },
  google: {
    message: 'O Google recusou a operação.',
    action: TRY_AGAIN,
  },
};

/** WhatsApp Cloud API / Graph API error codes. */
const META_ERRORS: Record<number, FriendlyError> = {
  4: RETRY_LATER,
  80007: RETRY_LATER,
  130429: RETRY_LATER,
  190: RECONNECT,
  10: PERMISSION,
  200: PERMISSION,
  131042: PAYMENT,
  131031: {
    message: 'A conta do WhatsApp Business foi bloqueada pela Meta.',
    action: 'Abra o Gerenciador de Negócios, veja o aviso da Meta e siga o que ela pedir.',
  },
  131037: {
    message: 'O nome de exibição do WhatsApp ainda precisa ser aprovado.',
    action: 'Acompanhe a aprovação no Gerenciador do WhatsApp. Costuma levar até um dia.',
  },
  131047: {
    message: 'Passaram mais de 24 horas desde a última mensagem do paciente.',
    action: 'Só um modelo de mensagem aprovado pode ser enviado agora.',
  },
  131048: {
    message: 'A Meta limitou os envios por suspeita de spam.',
    action: 'Pare de enviar por algumas horas e revise o texto das mensagens.',
  },
  131056: {
    message: 'Foram muitas mensagens para o mesmo paciente em pouco tempo.',
    action: 'Espere um pouco antes de enviar outra mensagem a ele.',
  },
  133010: {
    message: 'O número ainda não está registrado no WhatsApp Business.',
    action: 'Conclua o registro do número na conexão e tente de novo.',
  },
};

/** Google OAuth `error` values and Calendar API `reason` values. */
const GOOGLE_ERRORS: Record<string, FriendlyError> = {
  access_denied: {
    message: 'Você não autorizou o acesso à agenda.',
    action: 'Conecte de novo e marque a permissão de agenda. Se preferir, pule esta etapa.',
  },
  invalid_grant: RECONNECT,
  authError: RECONNECT,
  rateLimitExceeded: RETRY_LATER,
  userRateLimitExceeded: RETRY_LATER,
  notFound: {
    message: 'Não encontramos essa agenda na sua conta Google.',
    action: 'Escolha outra agenda ou conecte de novo.',
  },
  forbidden: PERMISSION,
  insufficientPermissions: PERMISSION,
};

export type ProviderErrorRef =
  | { provider: typeof Provider.meta; code: number }
  | { provider: typeof Provider.google; code: string };

/** Plain-language message and next step for a provider error; generic when the code is unknown. */
export function translateProviderError(error: ProviderErrorRef): FriendlyError {
  const known =
    error.provider === Provider.meta ? META_ERRORS[error.code] : GOOGLE_ERRORS[error.code];
  return known ?? GENERIC_ERRORS[error.provider];
}
