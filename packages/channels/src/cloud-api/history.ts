import { toE164 } from '../phone.ts';
import {
  ContactAction,
  ContentType,
  InboundKind,
  type ContactRef,
  type InboundEvent,
  type MessageContent,
} from '../types.ts';
import type {
  HistoryChunk,
  HistoryThread,
  InboundMessage,
  StateSync,
  WebhookValue,
} from './schemas.ts';

// Coexistence sync (E-24b; Meta, "Onboarding WhatsApp Business app users"): the `history` webhook
// carries past threads, `smb_app_state_sync` the owner's phone book.

const MS_PER_SECOND = 1000;
/** Meta's error when the owner did not share the history in the Business app. */
const HISTORY_NOT_SHARED = 2_593_109;
const CONTACT = 'contact';
const REMOVE = 'remove';

const at = (seconds: string | undefined): Date => new Date(Number(seconds ?? 0) * MS_PER_SECOND);

export function historyEvents(value: WebhookValue): InboundEvent[] {
  return (value.history ?? []).flatMap(chunkEvents);
}

function chunkEvents(chunk: HistoryChunk): InboundEvent[] {
  const now = new Date();
  if (chunk.errors?.some((error) => error.code === HISTORY_NOT_SHARED))
    return [{ kind: InboundKind.historyDeclined, at: now }];
  const progress = chunk.metadata?.progress;
  const done: InboundEvent[] =
    progress === undefined ? [] : [{ kind: InboundKind.historyProgress, progress, at: now }];
  return [...chunk.threads.flatMap(threadEvents), ...done];
}

function threadEvents(thread: HistoryThread): InboundEvent[] {
  const phone = thread.context?.wa_id ?? thread.id;
  const bsuid = thread.context?.user_id;
  const contact: ContactRef = {
    bsuid,
    phoneE164: phone ? (toE164(phone) ?? undefined) : undefined,
    name: undefined,
  };
  return thread.messages.map((message) => ({
    kind: InboundKind.historyMessage,
    providerMessageId: message.id,
    contact,
    at: at(message.timestamp),
    content: textOnly(message),
    fromOwner: !isFromUser(message, phone),
  }));
}

/** The user's messages carry `from_user_id` or the user's own phone; the business's carry neither. */
function isFromUser(message: InboundMessage, threadPhone: string | undefined): boolean {
  return message.from_user_id !== undefined || (!!threadPhone && message.from === threadPhone);
}

/** Text is kept; anything else becomes a placeholder, so no media of the history is ever fetched. */
function textOnly(message: InboundMessage): MessageContent {
  if (message.type === ContentType.text && message.text)
    return { type: ContentType.text, text: message.text.body };
  return { type: ContentType.unsupported, raw: message.type };
}

export function stateSyncEvents(value: WebhookValue): InboundEvent[] {
  return (value.state_sync ?? []).flatMap(contactEvent);
}

function contactEvent(entry: StateSync): InboundEvent[] {
  const { contact } = entry;
  if (entry.type !== CONTACT || !contact) return [];
  const phone = contact.phone_number ? toE164(contact.phone_number) : null;
  if (!phone && !contact.user_id) return [];
  return [
    {
      kind: InboundKind.contactSync,
      contact: { bsuid: contact.user_id, phoneE164: phone ?? undefined, name: contact.full_name },
      action: entry.action === REMOVE ? ContactAction.remove : ContactAction.add,
      at: at(entry.metadata?.timestamp),
    },
  ];
}
