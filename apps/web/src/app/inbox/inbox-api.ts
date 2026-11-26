import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors the API (apps/api/src/conversations/view.ts); the web does not import server code.

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

export const Control = { ai: 'ai', human: 'human' } as const;
export type Control = (typeof Control)[keyof typeof Control];

export const DraftAction = { approve: 'approve', edit: 'edit', discard: 'discard' } as const;
export type DraftAction = (typeof DraftAction)[keyof typeof DraftAction];

export type MessageType =
  | 'text'
  | 'audio'
  | 'image'
  | 'document'
  | 'sticker'
  | 'location'
  | 'interactive_reply'
  | 'template'
  | 'unsupported';

export interface ConversationSummary {
  id: string;
  name: string | null;
  phone: string | null;
  control: Control;
  state: InboxState;
  unreadCount: number;
  lastMessage: { author: Author; type: MessageType; text: string | null; at: string } | null;
}

export const MediaState = {
  pending: 'pending',
  stored: 'stored',
  unavailable: 'unavailable',
} as const;
export type MediaState = (typeof MediaState)[keyof typeof MediaState];

export interface MessageView {
  id: string;
  author: Author;
  type: MessageType;
  text: string | null;
  /** Audio, image or document (E-10); `url` only once the file is stored. */
  media: { state: MediaState; mime: string; url: string | null } | null;
  at: string;
  /** E-24b: from the WhatsApp history; read-only context. */
  imported: boolean;
  /** The owner wrote it in the WhatsApp Business app. */
  sentFromPhone: boolean;
}

export interface ControlEvent {
  at: string;
  to: Control;
  reason: string | null;
}

export interface PendingDraft {
  turnId: string;
  text: string;
  version: number;
}

export interface ConversationDetail extends Omit<ConversationSummary, 'lastMessage'> {
  draft: PendingDraft | null;
  messages: MessageView[];
  events: ControlEvent[];
}

const BASE = '/api/conversations';
const POST = 'POST';
export const LIST_KEY = ['conversations'];
const detailKey = (id: string) => ['conversation', id];

export function useConversations() {
  return useQuery({ queryKey: LIST_KEY, queryFn: () => api<ConversationSummary[]>(BASE) });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => api<ConversationDetail>(`${BASE}/${id}`),
  });
}

/** Refetches the list and the open conversation after any change. */
function useRefreshAfter(id: string) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: LIST_KEY }),
      client.invalidateQueries({ queryKey: detailKey(id) }),
    ]);
}

export function useMarkRead(id: string) {
  const refresh = useRefreshAfter(id);
  return useMutation({
    mutationFn: () => api(`${BASE}/${id}/read`, { method: POST, body: {} }),
    onSuccess: refresh,
  });
}

export function useSetControl(id: string) {
  const refresh = useRefreshAfter(id);
  return useMutation({
    mutationFn: (to: Control) => api(`${BASE}/${id}/control`, { method: POST, body: { to } }),
    onSuccess: refresh,
  });
}

export function useSendMessage(id: string) {
  const refresh = useRefreshAfter(id);
  return useMutation({
    mutationFn: (text: string) => api(`${BASE}/${id}/messages`, { method: POST, body: { text } }),
    onSuccess: refresh,
  });
}

export interface DraftDecision {
  action: DraftAction;
  turnId: string;
  text?: string;
}

export function useDecideDraft(id: string) {
  const refresh = useRefreshAfter(id);
  return useMutation({
    mutationFn: (body: DraftDecision) => api(`${BASE}/${id}/draft`, { method: POST, body }),
    // A stale draft (409) is also refreshed away: the panel then shows what is current.
    onSettled: refresh,
  });
}
