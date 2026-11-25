import type { Db } from '@app/db';
import * as z from 'zod';
import { buildNotice, type Notice, type NotifyReason } from './reasons.ts';

// The push service says the browser unsubscribed: the stored subscription is dead.
const HTTP_NOT_FOUND = 404;
const HTTP_GONE = 410;
const GONE_STATUSES: ReadonlySet<number> = new Set([HTTP_NOT_FOUND, HTTP_GONE]);
const TTL_SECONDS = 3600;
const URGENT_TTL_SECONDS = 86_400;
const NO_KEYS = 'push keys not configured: the professional was not notified';
const PUSH_FAILED = 'push delivery failed';
const NOTIFIED = 'professional notified';

/** Optional in development: without the keys a notice is only logged (ids, never content). */
export const pushEnvSchema = z.object({
  PUSH_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  PUSH_VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  /** VAPID contact: a mailto: or https: URL. */
  PUSH_SUBJECT: z.string().min(1).optional(),
});

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushOptions {
  vapidDetails: { subject: string; publicKey: string; privateKey: string };
  TTL: number;
  urgency: 'high' | 'normal';
}

/** web-push's sendNotification, injectable so tests never touch the network. */
export type SendPush = (target: PushTarget, payload: string, options: PushOptions) => Promise<void>;

export interface Logger {
  warn: (fields: object, message: string) => void;
  info: (fields: object, message: string) => void;
}

export type Notifier = (input: {
  tenantId: string;
  conversationId: string;
  reason: NotifyReason;
}) => Promise<void>;

export interface NotifierDeps {
  db: Db;
  /** null: keys not configured. */
  vapid: VapidConfig | null;
  send: SendPush;
  log: Logger;
}

export function vapidFrom(env: z.infer<typeof pushEnvSchema>): VapidConfig | null {
  const { PUSH_VAPID_PUBLIC_KEY: publicKey, PUSH_VAPID_PRIVATE_KEY: privateKey } = env;
  if (!publicKey || !privateKey || !env.PUSH_SUBJECT) return null;
  return { publicKey, privateKey, subject: env.PUSH_SUBJECT };
}

export type Deliver = (tenantId: string, notice: Notice, fields: object) => Promise<void>;

/** Sends one notice to every browser the tenant's users subscribed; drops dead subscriptions. */
export function createDelivery({ db, vapid, send, log }: NotifierDeps): Deliver {
  return async (tenantId, notice, fields) => {
    if (!vapid) {
      log.warn({ tenantId, ...fields }, NO_KEYS);
      return;
    }
    const payload = JSON.stringify(notice);
    const options: PushOptions = {
      vapidDetails: vapid,
      TTL: notice.urgent ? URGENT_TTL_SECONDS : TTL_SECONDS,
      urgency: notice.urgent ? 'high' : 'normal',
    };
    const subscriptions = await db.withTenant(tenantId, (tx) => tx.pushSubscription.findMany());
    const results = await Promise.all(
      subscriptions.map(async ({ id, endpoint, p256dh, auth }) => {
        const failure = await send({ endpoint, keys: { p256dh, auth } }, payload, options).then(
          () => null,
          (error: unknown) => error,
        );
        if (failure !== null && !isGone(failure)) log.warn({ tenantId, ...fields }, PUSH_FAILED);
        return failure !== null && isGone(failure) ? id : null;
      }),
    );
    const gone = results.filter((id) => id !== null);
    if (gone.length > 0)
      await db.withTenant(tenantId, (tx) =>
        tx.pushSubscription.deleteMany({ where: { id: { in: gone } } }),
      );
    log.info({ tenantId, ...fields, devices: subscriptions.length }, NOTIFIED);
  };
}

export function createNotifier(deps: NotifierDeps): Notifier {
  const deliver = createDelivery(deps);
  return ({ tenantId, conversationId, reason }) =>
    deliver(tenantId, buildNotice(reason, conversationId), { conversationId, reason });
}

const failureSchema = z.object({ statusCode: z.number() });

function isGone(error: unknown): boolean {
  const failure = failureSchema.safeParse(error);
  return failure.success && GONE_STATUSES.has(failure.data.statusCode);
}
