import { ContentType, type MediaType, type MessageContent } from '../types.ts';
import type { InboundMessage } from './schemas.ts';

const MEDIA_TYPES: readonly MediaType[] = [
  ContentType.audio,
  ContentType.image,
  ContentType.document,
  ContentType.sticker,
];
const INTERACTIVE = 'interactive';
const BUTTON = 'button';

/** Maps one Cloud API message to our content union; anything else is "unsupported". */
export function toContent(message: InboundMessage): MessageContent {
  if (message.type === ContentType.text && message.text)
    return { type: ContentType.text, text: message.text.body };
  const media = mediaOf(message);
  if (media) return media;
  if (message.type === ContentType.location && message.location) {
    return {
      type: ContentType.location,
      lat: message.location.latitude,
      lng: message.location.longitude,
    };
  }
  const reply = replyOf(message);
  if (reply) return { type: ContentType.interactiveReply, ...reply };
  return { type: ContentType.unsupported, raw: message.type };
}

function mediaOf(message: InboundMessage): MessageContent | null {
  const type = MEDIA_TYPES.find((candidate) => candidate === message.type);
  const media = type ? message[type] : undefined;
  if (!type || !media) return null;
  return { type, mediaId: media.id, mime: media.mime_type, caption: media.caption };
}

function replyOf(message: InboundMessage): { id: string; title: string } | null {
  if (message.type === INTERACTIVE)
    return message.interactive?.button_reply ?? message.interactive?.list_reply ?? null;
  if (message.type === BUTTON && message.button)
    return { id: message.button.payload, title: message.button.text };
  return null;
}
