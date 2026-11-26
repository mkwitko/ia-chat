import { NodeEnv } from '@app/core';
import type { Db } from '@app/db';
import { sendNotification } from 'web-push';
import {
  createDelivery,
  createNotifier,
  pushEnvSchema,
  vapidFrom,
  type Deliver,
  type Logger,
  type NotifierDeps,
  type Notifier,
} from './push.ts';
import { buildSummaryNotice, type SummaryNotifier } from './summary-notice.ts';

export { NotifyReason } from './reasons.ts';
export type { Notifier } from './push.ts';
export type { SummaryNotifier } from './summary-notice.ts';

const PRODUCTION_WITHOUT_KEYS =
  'PUSH_VAPID_PUBLIC_KEY, PUSH_VAPID_PRIVATE_KEY and PUSH_SUBJECT are required in production: ' +
  'the professional must be notified of urgencies (RN-38, E-16)';
const SUMMARY_REASON = 'nightly_summary';

export interface NotifierSetup {
  db: Db;
  nodeEnv: string;
  source: Record<string, string | undefined>;
  log: Logger;
}

function deps({ db, nodeEnv, source, log }: NotifierSetup): NotifierDeps {
  const vapid = vapidFrom(pushEnvSchema.parse(source));
  if (!vapid && nodeEnv === NodeEnv.production) throw new Error(PRODUCTION_WITHOUT_KEYS);
  return {
    db,
    vapid,
    log,
    send: async (target, payload, options) => {
      await sendNotification(target, payload, options);
    },
  };
}

/** The real notifier (Web Push). In production it refuses to start without the VAPID keys. */
export function startNotifier(setup: NotifierSetup): Notifier {
  return createNotifier(deps(setup));
}

/** RF-15: the same delivery, for the nightly agenda notice (count and link only). */
export function startSummaryNotifier(setup: NotifierSetup): SummaryNotifier {
  const deliver = createDelivery(deps(setup));
  return ({ tenantId, ...summary }) =>
    deliver(tenantId, buildSummaryNotice(summary), { reason: SUMMARY_REASON });
}

/** The same delivery for any owner notice built elsewhere (the weekly report). */
export function startDelivery(setup: NotifierSetup): Deliver {
  return createDelivery(deps(setup));
}
