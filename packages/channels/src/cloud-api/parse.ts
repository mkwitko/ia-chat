import {
  ChannelState,
  DeliveryStatus,
  InboundKind,
  type ContactRef,
  type InboundBatch,
  type InboundEvent,
} from '../types.ts';
import { toE164 } from '../phone.ts';
import { toContent } from './content.ts';
import { historyEvents, stateSyncEvents } from './history.ts';
import {
  changesSchema,
  webhookSchema,
  type InboundMessage,
  type WebhookContact,
  type WebhookStatus,
  type WebhookValue,
} from './schemas.ts';

export const WebhookField = {
  messages: 'messages',
  echoes: 'smb_message_echoes',
  history: 'history',
  stateSync: 'smb_app_state_sync',
  accountUpdate: 'account_update',
} as const;

const MS_PER_SECOND = 1000;
const DELIVERY = new Set<string>(Object.values(DeliveryStatus));
// account_update events that block sending (nv: names from research 01, confirm with real payloads).
const RESTRICTING_EVENTS = new Set(['ACCOUNT_RESTRICTION', 'ACCOUNT_VIOLATION', 'DISABLED_UPDATE']);

/**
 * Cloud API webhook body → one batch per provider account. Messages, echoes and statuses
 * are keyed by phone_number_id; account updates by the WABA id (entry.id).
 */
export function parseCloudWebhook(rawBody: Buffer): InboundBatch[] {
  const body = webhookSchema.parse(JSON.parse(rawBody.toString('utf8')));
  const batches = new Map<string, InboundBatch>();
  for (const entry of body.entry) {
    for (const { field, value } of entry.changes) {
      const accountId =
        field === WebhookField.accountUpdate ? entry.id : value.metadata?.phone_number_id;
      if (!accountId) continue;
      const batch = batches.get(accountId) ?? { accountId, events: [], raw: [] };
      batch.events.push(...eventsOf(field, value));
      batch.raw.push({ field, value });
      batches.set(accountId, batch);
    }
  }
  return [...batches.values()];
}

/** Re-reads the raw part stored for one account (the worker side of RF-21). */
export function parseCloudChanges(raw: unknown): InboundEvent[] {
  return changesSchema.parse(raw).flatMap(({ field, value }) => eventsOf(field, value));
}

function eventsOf(field: string, value: WebhookValue): InboundEvent[] {
  if (field === WebhookField.messages) {
    const messages = (value.messages ?? []).map((message) =>
      patientMessage(message, value.contacts ?? []),
    );
    return [...messages, ...(value.statuses ?? []).flatMap(statusEvent)];
  }
  if (field === WebhookField.echoes) return (value.message_echoes ?? []).map(ownerEcho);
  if (field === WebhookField.accountUpdate) return channelState(value);
  if (field === WebhookField.history) return historyEvents(value);
  if (field === WebhookField.stateSync) return stateSyncEvents(value);
  return [];
}

function patientMessage(
  message: InboundMessage,
  contacts: readonly WebhookContact[],
): InboundEvent {
  const card = contacts.find(
    (contact) =>
      (contact.user_id !== undefined && contact.user_id === message.from_user_id) ||
      (contact.wa_id !== undefined && contact.wa_id === message.from),
  );
  const contact = contactRef(
    message.from_user_id ?? card?.user_id,
    message.from ?? card?.wa_id,
    card?.profile?.name,
  );
  return {
    kind: InboundKind.message,
    providerMessageId: message.id,
    contact,
    at: at(message.timestamp),
    content: toContent(message),
  };
}

function ownerEcho(
  echo: InboundMessage & { to?: string | undefined; to_user_id?: string | undefined },
): InboundEvent {
  const contact = contactRef(echo.to_user_id, echo.to, undefined);
  return {
    kind: InboundKind.ownerEcho,
    providerMessageId: echo.id,
    contact,
    at: at(echo.timestamp),
    content: toContent(echo),
  };
}

function statusEvent(status: WebhookStatus): InboundEvent[] {
  if (!DELIVERY.has(status.status)) return [];
  const error = status.errors?.[0];
  return [
    {
      kind: InboundKind.status,
      providerMessageId: status.id,
      status: status.status as DeliveryStatus,
      error: error ? { code: String(error.code), title: error.title } : undefined,
      pricing: status.pricing,
      at: at(status.timestamp),
    },
  ];
}

function channelState(value: WebhookValue): InboundEvent[] {
  const now = new Date();
  if (value.disconnection_info)
    return [{ kind: InboundKind.channelState, state: ChannelState.disconnected, at: now }];
  if (value.event && RESTRICTING_EVENTS.has(value.event))
    return [{ kind: InboundKind.channelState, state: ChannelState.restricted, at: now }];
  return [];
}

function contactRef(
  bsuid: string | undefined,
  phone: string | undefined,
  name: string | undefined,
): ContactRef {
  return { bsuid, phoneE164: phone ? (toE164(phone) ?? undefined) : undefined, name };
}

function at(seconds: string): Date {
  return new Date(Number(seconds) * MS_PER_SECOND);
}
