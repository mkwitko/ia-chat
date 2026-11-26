import * as z from 'zod';

// What `messages.media` holds for audio, image and document (spec 03, RF-24). Location,
// interactive replies and unsupported content keep their own shapes and are not parsed here.

export const MediaState = {
  /** Not downloaded yet; a turn waits for it. */
  pending: 'pending',
  stored: 'stored',
  /** RF-24: three attempts failed. */
  unavailable: 'unavailable',
} as const;
export type MediaState = (typeof MediaState)[keyof typeof MediaState];

/** Spec 03: audio past three minutes is transcribed up to here. */
export const MAX_AUDIO_SECONDS = 180;
/** RF-24: attempts before "mídia indisponível". */
export const MAX_MEDIA_ATTEMPTS = 3;
/** A turn does not wait for media longer than this (the job may have been lost). */
export const MEDIA_WAIT_MS = 120_000;

export const mediaInfoSchema = z.object({
  mediaId: z.string(),
  mime: z.string(),
  state: z.enum(MediaState),
  attempts: z.number().int().default(0),
  /** R2 key, once stored. */
  key: z.string().optional(),
  /** Audio longer than MAX_AUDIO_SECONDS: only the first minutes were transcribed. */
  truncated: z.boolean().optional(),
});
export type MediaInfo = z.infer<typeof mediaInfoSchema>;

/** Null for messages without downloadable media (text, stickers, location...). */
export function readMediaInfo(media: unknown): MediaInfo | null {
  const parsed = mediaInfoSchema.safeParse(media);
  return parsed.success ? parsed.data : null;
}
