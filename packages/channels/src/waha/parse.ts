import { toE164 } from '../phone.ts';
import {
  ChannelState,
  ContentType,
  DeliveryStatus,
  InboundKind,
  type ContactRef,
  type InboundBatch,
  type InboundEvent,
  type MediaType,
  type MessageContent,
} from '../types.ts';
import {
  WahaEvent,
  WahaSessionStatus,
  wahaAckSchema,
  wahaBodySchema,
  wahaMessageSchema,
  wahaStatusSchema,
  type WahaBody,
  type WahaMessage,
} from './schemas.ts';

/** A WhatsApp hidden user id (LID) kept where the Cloud API keeps the BSUID (RF-23b). */
export const LID_PREFIX = 'lid:';
const USER_SUFFIX = '@c.us';
const PHONE_SUFFIX = '@s.whatsapp.net';
const LID_SUFFIX = '@lid';
const API_SOURCE = 'api';
const MS_PER_SECOND = 1000;
const AUDIO = 'audio/';
const IMAGE = 'image/';
const STICKER_MIME = 'image/webp';

// message.ack: -1 error, 0 pending, 1 server, 2 device, 3 read, 4 played.
const ACK_STATUS: Readonly<Record<number, DeliveryStatus>> = {
  [-1]: DeliveryStatus.failed,
  1: DeliveryStatus.sent,
  2: DeliveryStatus.delivered,
  3: DeliveryStatus.read,
  4: DeliveryStatus.read,
};
const SESSION_STATE: Readonly<Record<string, ChannelState>> = {
  [WahaSessionStatus.working]: ChannelState.connected,
  [WahaSessionStatus.failed]: ChannelState.disconnected,
  [WahaSessionStatus.scanQr]: ChannelState.disconnected,
  [WahaSessionStatus.stopped]: ChannelState.disconnected,
};

/** One WAHA webhook (one event) → one batch keyed by the session name, our account id. */
export function parseWahaWebhook(rawBody: Buffer): InboundBatch[] {
  const body = wahaBodySchema.parse(JSON.parse(rawBody.toString('utf8')));
  return [{ accountId: body.session, events: eventsOf(body), raw: [body] }];
}

/** Re-reads the stored raw part (the worker side of RF-21). */
export function parseWahaEvents(raw: unknown): InboundEvent[] {
  return wahaBodySchema.array().parse(raw).flatMap(eventsOf);
}

function eventsOf(body: WahaBody): InboundEvent[] {
  switch (body.event) {
    case WahaEvent.messageAny:
      return messageEvent(wahaMessageSchema.parse(body.payload));
    case WahaEvent.ack:
      return ackEvent(wahaAckSchema.parse(body.payload));
    case WahaEvent.sessionStatus:
      return stateEvent(wahaStatusSchema.parse(body.payload).status);
    default:
      return [];
  }
}

function messageEvent(message: WahaMessage): InboundEvent[] {
  if (message.fromMe && message.source === API_SOURCE) return []; // ours, already stored
  const info = message._data?.Info;
  const contact = message.fromMe
    ? contactOf(message.to ?? '', info?.RecipientAlt, undefined)
    : contactOf(message.from, info?.SenderAlt, info?.PushName);
  if (!contact) return []; // groups, status and channels are out of scope
  const kind = message.fromMe ? InboundKind.ownerEcho : InboundKind.message;
  const at = new Date(message.timestamp * MS_PER_SECOND);
  return [{ kind, providerMessageId: message.id, contact, at, content: contentOf(message) }];
}

function ackEvent({ id, ack }: { id: string; ack: number }): InboundEvent[] {
  const status = ACK_STATUS[ack];
  return status
    ? [{ kind: InboundKind.status, providerMessageId: id, status, at: new Date() }]
    : [];
}

/** WAHA session status → our channel state; undefined while starting (nothing to say yet). */
export const wahaSessionState = (status: string): ChannelState | undefined => SESSION_STATE[status];

function stateEvent(status: string): InboundEvent[] {
  const state = wahaSessionState(status);
  return state ? [{ kind: InboundKind.channelState, state, at: new Date() }] : [];
}

const digitsOf = (jid: string) => jid.slice(0, jid.indexOf('@'));
const isPhoneJid = (jid: string | undefined) =>
  jid !== undefined && (jid.endsWith(USER_SUFFIX) || jid.endsWith(PHONE_SUFFIX));

function contactOf(
  jid: string,
  alt: string | undefined,
  name: string | undefined,
): ContactRef | null {
  if (isPhoneJid(jid))
    return { phoneE164: toE164(digitsOf(jid)) ?? undefined, bsuid: undefined, name };
  if (!jid.endsWith(LID_SUFFIX)) return null;
  const phone = alt && isPhoneJid(alt) ? (toE164(digitsOf(alt)) ?? undefined) : undefined;
  return { phoneE164: phone, bsuid: `${LID_PREFIX}${digitsOf(jid)}`, name };
}

function contentOf(message: WahaMessage): MessageContent {
  const caption = message.body ?? undefined;
  const url = message.media?.url;
  const mime = message.media?.mimetype;
  if (message.hasMedia && url && mime) return { ...mediaType(mime), mediaId: url, mime, caption };
  if (message.body) return { type: ContentType.text, text: message.body };
  return { type: ContentType.unsupported, raw: message.hasMedia ? (mime ?? '') : '' };
}

function mediaType(mime: string): { type: MediaType } {
  if (mime.startsWith(AUDIO)) return { type: ContentType.audio };
  if (mime === STICKER_MIME) return { type: ContentType.sticker };
  if (mime.startsWith(IMAGE)) return { type: ContentType.image };
  return { type: ContentType.document };
}
