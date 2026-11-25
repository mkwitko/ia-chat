import { buildState, loadTenantContext, type AgentInput as TenantAgentInput } from '@app/agent';
import { MessageAuthor, MessageType, type Tx } from '@app/db';
import type { ModelMessage } from 'ai';

// Spec 04, "Contexto do prompt": everything the agent knows comes from here, read inside
// the tenant transaction. Recent history: the last 20 messages; older ones are summarized.
export const HISTORY_LIMIT = 20;

const PLACEHOLDER: Partial<Record<MessageType, string>> = {
  [MessageType.audio]: '[áudio que não deu para ouvir]',
  [MessageType.image]: '[imagem]',
  [MessageType.document]: '[documento]',
  [MessageType.sticker]: '[figurinha]',
  [MessageType.location]: '[localização]',
  [MessageType.unsupported]: '[mensagem que não deu para abrir]',
};
// The transcript enters the turn as the patient's words, marked as audio (spec 03).
const AUDIO_PREFIX = '[áudio transcrito] ';
const PROFESSIONAL_PREFIX = '[o profissional respondeu] ';
export interface AgentInput extends TenantAgentInput {
  contactId: string;
}

export async function loadAgentInput(
  tx: Tx,
  conversationId: string,
  now: Date,
): Promise<AgentInput> {
  const conversation = await tx.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { contact: true },
  });
  const tenant = await loadTenantContext(tx, conversation.tenantId);
  const { history, firstMessage } = await loadHistory(tx, conversationId);
  const contactName = conversation.contact.name ?? undefined;
  return {
    ...tenant,
    state: buildState({
      now,
      timezone: tenant.timezone,
      contactName,
      firstMessage,
      summary: conversation.summary,
    }),
    history,
    personalNames: [contactName, ...tenant.personalNames].filter((name): name is string =>
      Boolean(name),
    ),
    contactId: conversation.contactId,
  };
}

async function loadHistory(
  tx: Tx,
  conversationId: string,
): Promise<{ history: ModelMessage[]; firstMessage: boolean }> {
  const recent = await tx.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  });
  const answered = await tx.message.count({
    where: { conversationId, author: { in: [MessageAuthor.ai, MessageAuthor.human] } },
  });
  const history = recent
    .toReversed()
    .map(toModelMessage)
    .filter((message) => message !== null);
  return { history, firstMessage: answered === 0 };
}

function toModelMessage(message: {
  author: MessageAuthor;
  type: MessageType;
  text: string | null;
}): ModelMessage | null {
  const spoken = message.type === MessageType.audio && message.text ? AUDIO_PREFIX : '';
  const text = spoken + (message.text ?? PLACEHOLDER[message.type] ?? '');
  if (message.author === MessageAuthor.system || !text) return null;
  if (message.author === MessageAuthor.patient) return { role: 'user', content: text };
  return {
    role: 'assistant',
    content: message.author === MessageAuthor.human ? PROFESSIONAL_PREFIX + text : text,
  };
}
