// What makes the assistant call the professional (spec 10, "Notificações"; spec 03, RF-35).

export const NotifyReason = {
  urgency: 'urgency',
  handoff: 'handoff',
  turnTimeout: 'turn_timeout',
  handoffReminder: 'handoff_reminder',
  draftPending: 'draft_pending',
  draftReminder: 'draft_reminder',
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
};

const CONVERSATION_PATH = '/conversas/';

export function buildNotice(reason: NotifyReason, conversationId: string): Notice {
  return {
    ...COPY[reason],
    url: `${CONVERSATION_PATH}${conversationId}`,
    tag: conversationId,
    urgent: reason === NotifyReason.urgency,
  };
}
