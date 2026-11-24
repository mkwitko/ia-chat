import { NodeEnv } from '@app/core';
import type { Db } from '@app/db';
import { sendNotification } from 'web-push';
import { createNotifier, pushEnvSchema, vapidFrom, type Logger, type Notifier } from './push.ts';

export { NotifyReason } from './reasons.ts';
export type { Notifier } from './push.ts';

const PRODUCTION_WITHOUT_KEYS =
  'PUSH_VAPID_PUBLIC_KEY, PUSH_VAPID_PRIVATE_KEY and PUSH_SUBJECT are required in production: ' +
  'the professional must be notified of urgencies (RN-38, E-16)';

export interface NotifierSetup {
  db: Db;
  nodeEnv: string;
  source: Record<string, string | undefined>;
  log: Logger;
}

/** The real notifier (Web Push). In production it refuses to start without the VAPID keys. */
export function startNotifier({ db, nodeEnv, source, log }: NotifierSetup): Notifier {
  const vapid = vapidFrom(pushEnvSchema.parse(source));
  if (!vapid && nodeEnv === NodeEnv.production) throw new Error(PRODUCTION_WITHOUT_KEYS);
  return createNotifier({
    db,
    vapid,
    log,
    send: async (target, payload, options) => {
      await sendNotification(target, payload, options);
    },
  });
}
