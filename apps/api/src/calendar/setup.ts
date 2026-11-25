import { googleCalendarConfig } from '@app/core';
import { createCalendarResolver, type CalendarResolver, type ResolverOptions } from '@app/db';
import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../app.ts';

/** E-21. `options` is null when the Google credentials or the token key are missing: feature off. */
export interface CalendarSetup {
  options: ResolverOptions | null;
  /** Resolves a tenant's calendar for booking; always null while the feature is off. */
  resolve: CalendarResolver;
  /** Signs the OAuth state. */
  secret: string;
  /** Where Google sends the user back to (this API). */
  redirectUri: string;
  webOrigin: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    calendar: CalendarSetup;
  }
}

const TRAILING_SLASH = /\/$/;
const CALLBACK_PATH = '/api/calendar/google/callback';

export function setupCalendar(app: FastifyInstance, deps: AppDeps): void {
  const { env } = deps;
  const base = {
    secret: env.BETTER_AUTH_SECRET,
    redirectUri: `${env.BETTER_AUTH_URL.replace(TRAILING_SLASH, '')}${CALLBACK_PATH}`,
    webOrigin: env.WEB_ORIGIN.replace(TRAILING_SLASH, ''),
  };
  const config = googleCalendarConfig(env);
  if (!config) {
    app.decorate('calendar', { ...base, options: null, resolve: () => Promise.resolve(null) });
    return;
  }
  const options: ResolverOptions = {
    db: deps.db,
    config,
    alert: app.alert,
    ...(deps.calendarFetch ? { fetch: deps.calendarFetch } : {}),
  };
  app.decorate('calendar', { ...base, options, resolve: createCalendarResolver(options) });
}
