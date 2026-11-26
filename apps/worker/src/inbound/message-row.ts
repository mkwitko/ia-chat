import { ContentType, type MessageContent } from '@app/channels';
import { MediaState } from '@app/core';
import { MessageType, type Prisma } from '@app/db';

const TYPE_BY_CONTENT: Readonly<Record<MessageContent['type'], MessageType>> = {
  [ContentType.text]: MessageType.text,
  [ContentType.audio]: MessageType.audio,
  [ContentType.image]: MessageType.image,
  [ContentType.document]: MessageType.document,
  [ContentType.sticker]: MessageType.sticker,
  [ContentType.location]: MessageType.location,
  [ContentType.interactiveReply]: MessageType.interactive_reply,
  [ContentType.unsupported]: MessageType.unsupported,
};

/** Message columns for a normalized content: text in `text`, everything else in `media`. */
export function contentColumns(content: MessageContent): {
  type: MessageType;
  text: string | null;
  media?: Prisma.InputJsonValue;
} {
  const type = TYPE_BY_CONTENT[content.type];
  if (content.type === ContentType.text) return { type, text: content.text };
  if (content.type === ContentType.interactiveReply)
    return { type, text: content.title, media: { replyId: content.id } };
  if (content.type === ContentType.location)
    return { type, text: null, media: { lat: content.lat, lng: content.lng } };
  if (content.type === ContentType.unsupported)
    return { type, text: null, media: { raw: content.raw } };
  const media = { mediaId: content.mediaId, mime: content.mime };
  // Stickers are never downloaded (spec 03); the rest waits for the media job (E-10).
  const state = content.type === ContentType.sticker ? {} : { state: MediaState.pending };
  return { type, text: content.caption ?? null, media: { ...media, ...state } };
}
