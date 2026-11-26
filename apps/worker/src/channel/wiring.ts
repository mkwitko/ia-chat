import { createWahaSessions, wahaConfig } from '@app/channels';
import { SESSION_HEALTH_QUEUE, type Db } from '@app/db';
import type { Alert } from '@app/observability';
import type { PgBoss } from 'pg-boss';
import type { Deliver } from '../notify/push.ts';
import {
  CHANNEL_DOWN_NOTICE,
  channelDownHandler,
  checkQrSessions,
  type ChannelDown,
} from './session-health.ts';

const EVERY_FIVE_MINUTES = '*/5 * * * *';
const CHECKED = 'qr session health checked';
const DOWN_REASON = 'channel_down';

export interface SessionHealthWiring {
  boss: PgBoss;
  db: Db;
  alert: Alert;
  deliver: Deliver;
  source: Record<string, string | undefined>;
  log: (fields: object, message: string) => void;
}

/** RF-29: what to do when a channel drops, shared by the inbound job and the health check. */
export function channelDownNotifier(alert: Alert, deliver: Deliver): ChannelDown {
  return channelDownHandler(alert, (tenantId) =>
    deliver(tenantId, CHANNEL_DOWN_NOTICE, { reason: DOWN_REASON }),
  );
}

/** E-09b: the periodic session check; off while WAHA is not configured. */
export async function startSessionHealth(wiring: SessionHealthWiring): Promise<void> {
  const waha = wahaConfig(wiring.source);
  if (!waha) return;
  const { boss, db, alert } = wiring;
  const sessions = createWahaSessions(waha);
  const onDown = channelDownNotifier(alert, wiring.deliver);
  await boss.schedule(SESSION_HEALTH_QUEUE.name, EVERY_FIVE_MINUTES);
  await boss.work(SESSION_HEALTH_QUEUE.name, async () => {
    const result = await checkQrSessions({ db, sessions, alert, onDown });
    if (result.checked > 0) wiring.log(result, CHECKED);
  });
}
