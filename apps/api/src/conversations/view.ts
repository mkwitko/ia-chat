import {
  ConversationControl,
  findPendingDraft,
  MessageAuthor,
  TurnState,
  type MessageType,
  type Tx,
} from '@app/db';
import { MediaState, readMediaInfo } from '@app/core';
import * as z from 'zod';
import { mediaUrl } from './media-route.ts';

// Spec 10, "Conversas": who has the conversation, in words the professional uses.

export const InboxState = {
  awaitingApproval: 'awaiting_approval',
  needsYou: 'needs_you',
  human: 'human',
  assistant: 'assistant',
} as const;
export type InboxState = (typeof InboxState)[keyof typeof InboxState];

export const Author = {
  patient: 'patient',
  assistant: 'assistant',
  professional: 'professional',
  system: 'system',
} as const;
export type Author = (typeof Author)[keyof typeof Author];

const AUTHOR_BY_COLUMN: Readonly<Record<MessageAuthor, Author>> = {
  [MessageAuthor.patient]: Author.patient,
  [MessageAuthor.ai]: Author.assistant,
  [MessageAuthor.human]: Author.professional,
  [MessageAuthor.system]: Author.system,
};

const LIST_LIMIT = 100;
const PREVIEW_CHARS = 140;
const CONTROL_AUDIT = 'conversation.control_changed';
const AUDIT_ENTITY = 'conversation';

export interface MessageView {
  id: string;
  author: Author;
  type: MessageType;
  text: string | null;
  /** Audio, image or document: the panel opens it through MEDIA_PATH once stored. */
  media: { state: MediaState; mime: string; url: string | null } | null;
  at: Date;
}

export interface ConversationSummary {
  id: string;
  name: string | null;
  phone: string | null;
  control: ConversationControl;
  state: InboxState;
  unreadCount: number;
  lastMessage: { author: Author; type: MessageType; text: string | null; at: Date } | null;
}

/** Awaiting you: the professional has the conversation and the last word is not theirs. */
export function stateOf(input: {
  control: ConversationControl;
  hasDraft: boolean;
  lastAuthor: Author | null;
}): InboxState {
  if (input.hasDraft) return InboxState.awaitingApproval;
  if (input.control === ConversationControl.ai) return InboxState.assistant;
  return input.lastAuthor === Author.professional ? InboxState.human : InboxState.needsYou;
}

const NEEDS_YOU: ReadonlySet<InboxState> = new Set([
  InboxState.awaitingApproval,
  InboxState.needsYou,
]);

/** Needs-you first, then the most recent. */
export async function listConversations(tx: Tx): Promise<ConversationSummary[]> {
  const rows = await tx.conversation.findMany({
    orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: LIST_LIMIT,
    include: { contact: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  const drafts = await tx.turn.findMany({
    where: { state: TurnState.draft, conversationId: { in: rows.map((row) => row.id) } },
    select: { conversationId: true, version: true },
  });
  const summaries = rows.map((row) => {
    const last = row.messages[0];
    const lastAuthor = last ? AUTHOR_BY_COLUMN[last.author] : null;
    const hasDraft =
      row.control === ConversationControl.ai &&
      drafts.some((d) => d.conversationId === row.id && d.version === row.turnVersion);
    return {
      id: row.id,
      name: row.contact.name,
      phone: row.contact.phoneE164,
      control: row.control,
      state: stateOf({ control: row.control, hasDraft, lastAuthor }),
      unreadCount: row.unreadCount,
      lastMessage:
        last && lastAuthor
          ? {
              author: lastAuthor,
              type: last.type,
              text: last.text?.slice(0, PREVIEW_CHARS) ?? null,
              at: last.createdAt,
            }
          : null,
    } satisfies ConversationSummary;
  });
  // Array.sort is stable: the recency order above is kept inside each group.
  return summaries.sort((a, b) => Number(NEEDS_YOU.has(b.state)) - Number(NEEDS_YOU.has(a.state)));
}

const DETAIL_MESSAGES = 200;

/** `url` is the media route (a redirect to a signed R2 URL); only once the file is stored. */
function mediaView(media: unknown, url: string): MessageView['media'] {
  const info = readMediaInfo(media);
  if (!info) return null;
  return { state: info.state, mime: info.mime, url: info.state === MediaState.stored ? url : null };
}

export interface ControlEvent {
  at: Date;
  to: ConversationControl;
  reason: string | null;
}

export async function readConversation(tx: Tx, conversationId: string) {
  const row = await tx.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true },
  });
  if (!row) return null;
  const messages = await tx.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: DETAIL_MESSAGES,
  });
  const audit = await tx.auditLog.findMany({
    where: { entity: AUDIT_ENTITY, entityId: conversationId, action: CONTROL_AUDIT },
    orderBy: { createdAt: 'asc' },
  });
  const draft = await findPendingDraft(tx, conversationId);
  const last = messages[0];
  const lastAuthor = last ? AUTHOR_BY_COLUMN[last.author] : null;
  return {
    id: row.id,
    name: row.contact.name,
    phone: row.contact.phoneE164,
    control: row.control,
    state: stateOf({ control: row.control, hasDraft: draft !== null, lastAuthor }),
    unreadCount: row.unreadCount,
    draft,
    messages: messages.toReversed().map((m): MessageView => ({
      id: m.id,
      author: AUTHOR_BY_COLUMN[m.author],
      type: m.type,
      text: m.text,
      media: mediaView(m.media, mediaUrl(conversationId, m.id)),
      at: m.createdAt,
    })),
    events: audit.map((entry) => controlEvent(entry.createdAt, entry.after)),
  };
}

const controlAfter = z.object({
  control: z.enum(ConversationControl),
  reason: z.string().nullish(),
});

function controlEvent(at: Date, after: unknown): ControlEvent {
  const { control, reason } = controlAfter.parse(after);
  return { at, to: control, reason: reason ?? null };
}
