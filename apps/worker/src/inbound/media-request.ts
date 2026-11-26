import { MediaState, readMediaInfo } from '@app/core';
import type { Tx } from '@app/db';

/** The stored message's id when it carries media to fetch (E-10); the job is queued after commit. */
export async function mediaToFetch(
  tx: Tx,
  input: { channelId: string; providerMessageId: string },
): Promise<string | null> {
  const message = await tx.message.findFirst({
    where: input,
    select: { id: true, media: true },
  });
  return message && readMediaInfo(message.media)?.state === MediaState.pending ? message.id : null;
}
