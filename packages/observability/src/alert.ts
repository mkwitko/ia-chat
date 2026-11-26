import { isString } from './guards.ts';
import type { LogContext } from './context.ts';
import { Sentry } from './sentry.ts';

/** Things the operator must look at. The value is the log message, the Sentry title and the key of `ops_events`. */
export const AlertEvent = {
  deadLetter: 'dead_letter',
  deliveryFailure: 'delivery_failure',
  webhookError: 'webhook_error',
  turnAborted: 'turn_aborted',
  queueError: 'queue_error',
  jobFailed: 'job_failed',
  /** Google Calendar token revoked or expired for good: the tenant must reconnect (E-21, A-13). */
  calendarDisconnected: 'calendar_disconnected',
  /** WhatsApp connection down (QR code session dropped, RF-29): the owner must scan again. */
  channelDisconnected: 'channel_disconnected',
} as const;
export type AlertEvent = (typeof AlertEvent)[keyof typeof AlertEvent];

/** Ids and a short machine code only: an alert never carries message content (RN-38). */
export interface AlertContext extends LogContext {
  code?: string | undefined;
}

/** `cause` is the caught error, when there is one: it is logged and sent to Sentry with its stack. */
export type Alert = (event: AlertEvent, context?: AlertContext, cause?: unknown) => void;

export interface AlertRecord extends AlertContext {
  event: AlertEvent;
}

export interface AlertDeps {
  log: {
    error: (fields: object, message: string) => void;
    warn: (fields: object, message: string) => void;
  };
  /** Keeps the alert for the operator panel (`ops_events`); optional. */
  record?: (alert: AlertRecord) => Promise<void>;
}

const RECORD_FAILED = 'could not record the alert';
const MAX_CODE_LENGTH = 64;
const ID_KEYS = ['tenantId', 'requestId', 'jobId', 'queue', 'conversationId', 'turnId'] as const;

/** Copies only the allowed id keys, so a caller cannot leak extra fields through an alert. */
export function pickAlertContext(context: AlertContext): AlertContext {
  const picked: AlertContext = {};
  for (const key of ID_KEYS) {
    const value = context[key];
    if (isString(value)) picked[key] = value;
  }
  if (isString(context.code)) picked.code = context.code.slice(0, MAX_CODE_LENGTH);
  return picked;
}

/** The fingerprint groups by event (and queue or code), never by ids, so Sentry shows one issue per kind. */
const fingerprintOf = (event: AlertEvent, { queue, code }: AlertContext): string[] => [
  event,
  ...(queue ? [queue] : []),
  ...(code ? [code] : []),
];

function sendToSentry(event: AlertEvent, context: AlertContext, cause: unknown): void {
  Sentry.withScope((scope) => {
    scope.setLevel('error');
    scope.setFingerprint(fingerprintOf(event, context));
    scope.setTags({ alert: event, ...context });
    if (cause === undefined) Sentry.captureMessage(event);
    else Sentry.captureException(cause);
  });
}

/** The single way to raise an alert: structured error log, Sentry (when on) and `ops_events`. */
export function createAlert({ log, record }: AlertDeps): Alert {
  return (event, context = {}, cause) => {
    const picked = pickAlertContext(context);
    log.error({ alert: event, ...picked, ...(cause === undefined ? {} : { err: cause }) }, event);
    sendToSentry(event, picked, cause);
    record?.({ event, ...picked }).catch((error: unknown) => {
      log.warn({ err: error }, RECORD_FAILED);
    });
  };
}
