import type { Db } from './index.ts';
import { isUuid } from './tenant-context.ts';

/** What `alert()` keeps for the operator panel: ids and a short code, never content (RN-38). */
export interface OpsEventInput {
  event: string;
  tenantId?: string | undefined;
  queue?: string | undefined;
  jobId?: string | undefined;
  conversationId?: string | undefined;
  turnId?: string | undefined;
  code?: string | undefined;
}

export const RECENT_OPS_EVENTS = 50;

/** Ids that are not UUIDs (a malformed value) are dropped: the row must never fail to save. */
const uuidOrNull = (value: string | undefined) => (value && isUuid(value) ? value : null);

export async function recordOpsEvent(db: Db, input: OpsEventInput): Promise<void> {
  await db.client.opsEvent.create({
    data: {
      event: input.event,
      tenantId: uuidOrNull(input.tenantId),
      conversationId: uuidOrNull(input.conversationId),
      turnId: uuidOrNull(input.turnId),
      queue: input.queue ?? null,
      jobId: input.jobId ?? null,
      code: input.code ?? null,
    },
  });
}

/** Newest first. Platform table: read through the unscoped client. */
export function recentOpsEvents(db: Db, limit = RECENT_OPS_EVENTS) {
  return db.client.opsEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
}
