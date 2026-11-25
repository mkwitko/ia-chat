import { TURN_QUEUE, sendTenantJob } from '@app/db';
import type { PgBoss } from 'pg-boss';
import type { TurnRequest } from './schedule.ts';

// E-11: one job per (conversation, version); an older version finds a newer one and skips.
export function turnScheduler(boss: PgBoss) {
  return async (tenantId: string, request: TurnRequest): Promise<void> => {
    await sendTenantJob({
      boss,
      queue: TURN_QUEUE.name,
      job: { tenantId, data: { conversationId: request.conversationId, version: request.version } },
      options: {
        startAfter: new Date(Date.now() + request.delayMs),
        singletonKey: `${request.conversationId}:${String(request.version)}`,
      },
    });
  };
}
