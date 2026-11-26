export const GrowthCopy = {
  title: 'Mensagens automáticas',
  intro:
    'Mensagens que o assistente manda por conta própria, uma só vez, e só se você ligar. Você decide quando e o que ele diz.',
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
  review: {
    heading: 'Pedir avaliação depois do atendimento',
    toggle: 'Pedir uma avaliação a quem compareceu',
    toggleHint:
      'Uma mensagem com o seu link do Google, depois que você marcar "Compareceu". No máximo uma vez a cada 90 dias por cliente. Não vai para quem pediu para parar, nem para conversa que você assumiu. Fora das 24 horas do WhatsApp, o assistente não envia: avisa você.',
    delayLabel: 'Enviar depois de',
    hours: (count: number) => (count === 1 ? '1 hora' : `${String(count)} horas`),
    needsLink: 'Falta o link de avaliação do Google no perfil do negócio.',
    addLink: 'Informar o link',
    linkLabel: 'Link que será enviado',
    save: 'Salvar',
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

const MAX_REVIEW_HOURS = 48;
/** 1 to 48 hours, mirroring the server range. */
export const REVIEW_HOUR_OPTIONS = Array.from(
  { length: MAX_REVIEW_HOURS },
  (_, index) => index + 1,
);
