import * as Sentry from '@sentry/node';
import { isObject } from './guards.ts';
import { scrub, scrubString } from './scrub.ts';

export interface SentryConfig {
  service: string;
  dsn?: string | undefined;
  release?: string | undefined;
  environment: string;
}

const QUERY_SEPARATOR = '?';
const isSame = <T>(_original: T, candidate: unknown): candidate is T => isObject(candidate);

/** What Sentry may keep of the request: method and path. No body, headers, cookies or query. */
function trimRequest(request: Sentry.ErrorEvent['request']): Sentry.ErrorEvent['request'] {
  if (!request) return undefined;
  const { method, url } = request;
  return {
    ...(method ? { method } : {}),
    ...(url ? { url: scrubString(url.split(QUERY_SEPARATOR)[0] ?? '') } : {}),
  };
}

/**
 * beforeSend: no request bodies, no user, no message text, no phone or email anywhere in the
 * event. Ids (tenantId, jobId...) stay as tags and extras.
 */
export function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const { request, breadcrumbs, ...others } = event;
  delete others.user;
  // Breadcrumb text is free-form (console, http): keep only what happened, not what was said.
  const rest = {
    ...others,
    ...(breadcrumbs && {
      breadcrumbs: breadcrumbs.map(({ category, level, timestamp, type }) => ({
        ...(category && { category }),
        ...(level && { level }),
        ...(timestamp && { timestamp }),
        ...(type && { type }),
      })),
    }),
  };
  const clean = scrub(rest);
  const base = isSame(rest, clean) ? clean : rest;
  const trimmed = trimRequest(request);
  return trimmed ? { ...base, request: trimmed } : base;
}

/** Starts Sentry only when a DSN exists; without it every capture call is a no-op. */
export function initSentry({ service, dsn, release, environment }: SentryConfig): boolean {
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment,
    ...(release ? { release } : {}),
    tracesSampleRate: 0,
    initialScope: { tags: { service } },
    beforeSend: scrubEvent,
  });
  return true;
}

export { Sentry };
