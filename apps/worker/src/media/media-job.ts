import type { MediaDownloadFor } from '@app/channels';
import {
  Feature,
  MAX_AUDIO_SECONDS,
  MAX_MEDIA_ATTEMPTS,
  MediaState,
  mediaKey,
  readMediaInfo,
  type MediaInfo,
  type MediaStore,
} from '@app/core';
import { MessageAuthor, MessageType, featureEnabled, type Db, type Prisma } from '@app/db';
import { onPatientMessage, type TurnRequest } from '../conversation/schedule.ts';
import { cutAudio, trimTranscript } from './audio-cut.ts';

// E-10 (RF-24): download the patient's media to R2 right away (Meta's URL lives 5 minutes),
// transcribe audio, and ask for the turn that was waiting. Three failures: "indisponível".

const FAILED = 'media fetch failed';

export interface MediaDeps {
  db: Db;
  downloadFor: MediaDownloadFor;
  store: Pick<MediaStore, 'put'>;
  /** Our AI gateway (Vercel AI Gateway). Absent: audio is stored but has no transcript. */
  transcribe?:
    | ((input: {
        tenantId: string;
        conversationId: string;
        audio: Uint8Array;
      }) => Promise<{ text: string; seconds: number }>)
    | undefined;
  scheduleTurn: (tenantId: string, request: TurnRequest) => Promise<void>;
  /** Ids only: never the transcript or the file name (RN-38). */
  log: (fields: object, message: string) => void;
}

interface Target {
  tenantId: string;
  messageId: string;
}

interface Loaded {
  channelId: string;
  conversationId: string;
  type: MessageType;
  fromPatient: boolean;
  text: string | null;
  info: MediaInfo;
}

/** Throws while attempts remain (pg-boss retries with backoff); the last failure settles. */
export async function processMedia(deps: MediaDeps, target: Target): Promise<void> {
  const loaded = await load(deps.db, target);
  if (!loaded) return;
  try {
    await fetchAndStore(deps, { target, loaded });
  } catch (error) {
    await failed(deps, { target, loaded, error });
  }
}

async function load(db: Db, { tenantId, messageId }: Target): Promise<Loaded | null> {
  const row = await db.withTenant(tenantId, (tx) =>
    tx.message.findUnique({ where: { id: messageId } }),
  );
  const info = readMediaInfo(row?.media);
  if (!row || info?.state !== MediaState.pending) return null;
  return {
    channelId: row.channelId,
    conversationId: row.conversationId,
    type: row.type,
    fromPatient: row.author === MessageAuthor.patient,
    text: row.text,
    info,
  };
}

async function fetchAndStore(
  deps: MediaDeps,
  { target, loaded }: { target: Target; loaded: Loaded },
): Promise<void> {
  const { tenantId, messageId } = target;
  const download = await deps.db.withTenant(tenantId, (tx) =>
    deps.downloadFor(tx, loaded.channelId),
  );
  const { bytes, mime } = await download(loaded.info.mediaId);
  const key = mediaKey({ tenantId, messageId, mime });
  await deps.store.put(key, { bytes, mime });
  // Only the patient's audio is worth a transcription; the owner's own audio is not.
  const heard =
    loaded.type === MessageType.audio && loaded.fromPatient
      ? await transcribe(deps, { tenantId, loaded, bytes })
      : undefined;
  const info: MediaInfo = {
    ...loaded.info,
    mime,
    key,
    state: MediaState.stored,
    ...(heard?.truncated ? { truncated: true } : {}),
  };
  await save(deps, { target, loaded, info, text: heard?.text ?? loaded.text });
}

async function transcribe(
  deps: MediaDeps,
  { tenantId, loaded, bytes }: { tenantId: string; loaded: Loaded; bytes: Buffer },
): Promise<{ text: string | null; truncated: boolean } | undefined> {
  if (!deps.transcribe) return undefined;
  // Recursos (H-51): the owner can turn transcription off; the audio is still stored.
  if (!(await featureEnabled(deps.db, tenantId, Feature.audioTranscription))) return undefined;
  const cut = cutAudio(bytes, MAX_AUDIO_SECONDS);
  const { text, seconds } = await deps.transcribe({
    tenantId,
    conversationId: loaded.conversationId,
    audio: cut.bytes,
  });
  const kept = trimTranscript(text, seconds, MAX_AUDIO_SECONDS);
  return {
    text: kept.trim() || null,
    truncated: cut.truncated || kept.length < text.length,
  };
}

async function failed(
  deps: MediaDeps,
  { target, loaded, error }: { target: Target; loaded: Loaded; error: unknown },
): Promise<void> {
  const attempts = loaded.info.attempts + 1;
  const last = attempts >= MAX_MEDIA_ATTEMPTS;
  const info: MediaInfo = {
    ...loaded.info,
    attempts,
    state: last ? MediaState.unavailable : MediaState.pending,
  };
  deps.log({ ...target, attempts, error: errorName(error) }, FAILED);
  await save(deps, { target, loaded, info, text: loaded.text, settle: last });
  if (!last) throw error;
}

const errorName = (error: unknown) => (error instanceof Error ? error.name : typeof error);

interface Save {
  target: Target;
  loaded: Loaded;
  info: MediaInfo;
  text: string | null;
  /** Ask for the turn that waited for this media. Default: when it is no longer pending. */
  settle?: boolean;
}

async function save(deps: MediaDeps, input: Save): Promise<void> {
  const { target, loaded, info, text } = input;
  const settle = input.settle ?? info.state !== MediaState.pending;
  const request = await deps.db.withTenant(target.tenantId, async (tx) => {
    await tx.message.update({
      where: { id: target.messageId },
      data: { text, media: info satisfies Prisma.InputJsonValue },
    });
    if (!settle || !loaded.fromPatient) return null;
    const conversation = await tx.conversation.findUniqueOrThrow({
      where: { id: loaded.conversationId },
    });
    // No pending turn: it already answered (the wait ran out) and a late answer would be a second one.
    return conversation.pendingSince ? onPatientMessage(tx, conversation, new Date()) : null;
  });
  if (request) await deps.scheduleTurn(target.tenantId, request);
}
