// What makes the assistant call the professional (spec 10, "Notificações"; spec 03, RF-35).

export const NotifyReason = {
  urgency: 'urgency',
  handoff: 'handoff',
  turnTimeout: 'turn_timeout',
  handoffReminder: 'handoff_reminder',
  draftPending: 'draft_pending',
  draftReminder: 'draft_reminder',
  usageWarning: 'usage_warning',
  usageFull: 'usage_full',
  waitlistSlot: 'waitlist_slot',
  noShow: 'no_show',
  leadFollowUp: 'lead_follow_up',
} as const;
export type NotifyReason = (typeof NotifyReason)[keyof typeof NotifyReason];

export interface Notice {
  title: string;
  body: string;
  /** Panel path the notification opens. */
  url: string;
  /** One notification per conversation: a newer one replaces the older (grouping). */
  tag: string;
  /** Emergencies ask the push service for immediate delivery. */
  urgent: boolean;
}

interface Copy {
  title: string;
  body: string;
}

// RN-38: no message content, no patient name. Only what happened and where to tap.
const COPY: Record<NotifyReason, Copy> = {
  urgency: {
    title: 'Possível urgência',
    body: 'Um paciente precisa de você agora. Toque para abrir a conversa.',
  },
  handoff: {
    title: 'Paciente precisa de você',
    body: 'O assistente passou uma conversa para você.',
  },
  turn_timeout: {
    title: 'Resposta atrasada',
    body: 'O assistente demorou e pediu ao paciente que aguarde. Confira a conversa.',
  },
  handoff_reminder: {
    title: 'Paciente ainda espera por você',
    body: 'Uma conversa que o assistente passou para você segue sem resposta.',
  },
  draft_pending: {
    title: 'Rascunho para aprovar',
    body: 'O assistente escreveu uma resposta e espera o seu OK antes de enviar.',
  },
  draft_reminder: {
    title: 'Rascunho sem aprovação',
    body: 'Uma resposta continua esperando o seu OK. Nada foi enviado ao paciente.',
  },
  usage_warning: {
    title: 'Você usou 80% das conversas do mês',
    body: 'Toque para ver o uso e, se quiser, definir um teto para o excedente.',
  },
  usage_full: {
    title: 'As conversas do mês acabaram',
    body: 'O atendimento continua. O que passar da franquia é cobrado como excedente.',
  },
  waitlist_slot: {
    title: 'Horário livre para a lista de espera',
    body: 'Abriu um horário e um cliente da lista não pôde ser avisado pelo assistente. Toque para falar com ele.',
  },
  lead_follow_up: {
    title: 'Cliente sem resposta',
    body: 'O assistente não pôde fazer o contato de retorno combinado. Toque para falar com o cliente.',
  },
  no_show: {
    title: 'Cliente faltou',
    body: 'O assistente não pôde perguntar sobre a remarcação. Toque para falar com o cliente.',
  },
};

const CONVERSATION_PATH = '/conversas/';
const USAGE_PATH = '/mais/plano-e-uso';
const USAGE_REASONS: ReadonlySet<NotifyReason> = new Set([
  NotifyReason.usageWarning,
  NotifyReason.usageFull,
]);

export function buildNotice(reason: NotifyReason, conversationId: string): Notice {
  const usage = USAGE_REASONS.has(reason); // about the account, not one conversation
  return {
    ...COPY[reason],
    url: usage ? USAGE_PATH : `${CONVERSATION_PATH}${conversationId}`,
    tag: usage ? reason : conversationId,
    urgent: reason === NotifyReason.urgency,
  };
}
