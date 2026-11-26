import { MEDIA_WAIT_MS, MediaState, readMediaInfo } from '@app/core';
import { MessageAuthor, type MessageType, type Tx } from '@app/db';
import type { TurnMessage } from './turn-types.ts';

// E-10 (RF-24): a turn waits for the patient's media (download, transcription) and then
// sees the transcript as text. The media job asks for a new turn when it is done.

interface Row {
  id: string;
  type: MessageType;
  text: string | null;
  media: unknown;
  createdAt: Date;
}

const isWaiting = (row: Row, now: Date): boolean =>
  readMediaInfo(row.media)?.state === MediaState.pending &&
  now.getTime() - row.createdAt.getTime() < MEDIA_WAIT_MS;

/** True while some message still has its media on the way (and the job was not lost). */
export function mediaPending(rows: readonly Row[], now: Date): boolean {
  return rows.some((row) => isWaiting(row, now));
}

export function turnMessage(row: Row): TurnMessage {
  const info = readMediaInfo(row.media);
  const { id, type, text } = row;
  return {
    id,
    type,
    text,
    // Still "pending" here means it outlived MEDIA_WAIT_MS: treated as failed.
    mediaUnavailable: info !== null && info.state !== MediaState.stored,
    audioTruncated: info?.truncated === true,
  };
}

/** Everything unanswered since pendingSince, including messages of a discarded turn (A-03). */
export function unansweredMessages(tx: Tx, conversationId: string, pendingSince: Date) {
  return tx.message.findMany({
    where: { conversationId, author: MessageAuthor.patient, createdAt: { gte: pendingSince } },
    orderBy: [{ providerTimestamp: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      type: true,
      text: true,
      media: true,
      createdAt: true,
      providerMessageId: true,
    },
  });
}
