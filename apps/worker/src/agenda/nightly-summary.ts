import { tomorrowCount, type AfterCommit, type Tx } from '@app/db';
import type { AgendaSummary } from '../notify/summary-notice.ts';

/**
 * RF-15: the job of one tenant at its configured local time. Pushes only when the next day has
 * appointments (hypothesis H-19: an empty day is not worth a notification).
 */
export async function sendNightlySummary(
  tx: Tx,
  { tenantId, now }: { tenantId: string; now: Date },
  notify: (summary: AgendaSummary) => Promise<void>,
): Promise<AfterCommit | undefined> {
  const summary = await tomorrowCount(tx, { tenantId, now });
  if (summary.count === 0) return undefined;
  return () => notify(summary);
}
