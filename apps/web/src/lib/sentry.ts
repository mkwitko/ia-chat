import * as Sentry from '@sentry/react';

// Errors of the panel go to Sentry only when VITE_SENTRY_DSN is set (E-26). The same policy as the
// server (packages/observability/src/scrub.ts), kept local because the web does not import packages.

const REDACTED = '[redacted]';
const QUERY_SEPARATOR = '?';
const WHITESPACE_RUNS = /(\s+)/;
const AT_SIGN = '@';
const PHONE_DIGITS = /(?<![\w-])\+?\d{10,15}(?![\w-])/g;
const PHONE_BR = /\(\d{2}\) ?9?\d{4}-?\d{4}/g;

const maskEmails = (text: string): string =>
  text
    .split(WHITESPACE_RUNS)
    .map((token) => (token.includes(AT_SIGN) ? REDACTED : token))
    .join('');

export const maskText = (text: string): string =>
  maskEmails(text).replaceAll(PHONE_DIGITS, REDACTED).replaceAll(PHONE_BR, REDACTED);

/** No user, no request body or headers, no breadcrumb text, no phone or email in any message. */
export function scrubWebEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const { request, breadcrumbs, exception, message, ...rest } = event;
  delete rest.user;
  delete rest.extra;
  return {
    ...rest,
    ...(message && { message: maskText(message) }),
    ...(exception?.values && {
      exception: {
        values: exception.values.map((item) => ({
          ...item,
          ...(item.value && { value: maskText(item.value) }),
        })),
      },
    }),
    ...(breadcrumbs && {
      breadcrumbs: breadcrumbs.map(({ category, level, timestamp, type }) => ({
        ...(category && { category }),
        ...(level && { level }),
        ...(timestamp && { timestamp }),
        ...(type && { type }),
      })),
    }),
    ...(request?.url && {
      request: { url: maskText(request.url.split(QUERY_SEPARATOR)[0] ?? '') },
    }),
  };
}

/** No-op without a DSN. Unhandled errors and rejections are captured by the SDK's global handlers. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    ...(import.meta.env.VITE_RELEASE && { release: import.meta.env.VITE_RELEASE }),
    beforeSend: scrubWebEvent,
  });
}
