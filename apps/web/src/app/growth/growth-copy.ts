export const GrowthCopy = {
  title: 'Retorno de clientes',
  intro:
    'Contatos que pararam de responder antes de marcar horário. Você decide se o assistente manda um lembrete e o que ele diz.',
  followUp: {
    heading: 'Retomar quem não marcou',
    toggle: 'Mandar uma mensagem a quem parou de responder',
    toggleHint:
      'Uma única mensagem por contato, nunca repetida. Não vai para quem pediu para parar, nem para conversa que você assumiu. Fora das 24 horas do WhatsApp, o assistente não envia: avisa você.',
    needsApproval: 'Confirme o texto abaixo para poder ligar.',
    daysLabel: 'Esperar sem resposta por',
    days: (count: number) => (count === 1 ? '1 dia' : `${String(count)} dias`),
    textLabel: 'Texto da mensagem',
    textHint:
      'Foi sugerido pelo sistema e só vale depois que você confirmar. Sem orientação de saúde e sem preço.',
    useDefault: 'Voltar ao texto sugerido',
    approvedAt: 'Texto confirmado por você.',
    notApproved: 'Texto sugerido, ainda não confirmado.',
    save: 'Confirmar texto e salvar',
  },
  loadFailed: 'Não conseguimos carregar. Tente de novo.',
} as const;

export const MAX_FOLLOW_UP_TEXT = 600;
const MAX_FOLLOW_UP_DAYS = 14;
/** 1 to 14 days, mirroring the server range. */
export const FOLLOW_UP_DAY_OPTIONS = Array.from(
  { length: MAX_FOLLOW_UP_DAYS },
  (_, index) => index + 1,
);
