import * as z from 'zod';
import { CalendarAuthError, CalendarError } from './types.ts';

// Google OAuth 2.0 for a web server app (developers.google.com/identity/protocols/oauth2/web-server).
// Smallest scopes that cover the agenda (docs/spec/05): free/busy of the chosen calendar, events
// on calendars the user owns, and the calendar list to pick one. `calendar.events.owned` is
// sensitive: a public app needs Google verification; until then only test users can connect.
export const GoogleScope = {
  freeBusy: 'https://www.googleapis.com/auth/calendar.events.freebusy',
  eventsOwned: 'https://www.googleapis.com/auth/calendar.events.owned',
  calendarList: 'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
} as const;
export const GOOGLE_SCOPES = Object.values(GoogleScope);

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=owner';
const REQUEST_TIMEOUT_MS = 5_000;
const MS_PER_SECOND = 1_000;
const INVALID_GRANT = 'invalid_grant';
const OAUTH_FAILED = 'google oauth request failed';
const OWNER_ROLE = 'owner';

export interface GoogleClient {
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
}

const tokenReply = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
});
const errorReply = z.object({ error: z.string() });
const listReply = z.object({
  items: z.array(z.object({ id: z.string(), summary: z.string(), accessRole: z.string() })),
});

export interface GoogleTokens {
  accessToken: string;
  expiresAt: Date;
  /** Only the first consent (or `prompt=consent`) returns one. */
  refreshToken?: string;
}

/** `state` binds the request to tenant and user (the API signs it); `offline` + consent give a refresh token. */
export function authorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false',
    state: input.state,
  }).toString();
  return url.toString();
}

async function post(client: GoogleClient, url: string, form: Record<string, string>) {
  const send = client.fetch ?? fetch;
  return send(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...form,
      client_id: client.clientId,
      client_secret: client.clientSecret,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((cause: unknown) => {
    throw new CalendarError(OAUTH_FAILED, { cause });
  });
}

async function readTokens(reply: Response, now: Date): Promise<GoogleTokens> {
  const json: unknown = await reply.json().catch(() => null);
  const failure = errorReply.safeParse(json);
  if (!reply.ok) {
    // invalid_grant: the refresh token was revoked, expired or the user removed access.
    if (failure.success && failure.data.error === INVALID_GRANT)
      throw new CalendarAuthError(INVALID_GRANT);
    throw new CalendarError(`${OAUTH_FAILED} (${String(reply.status)})`);
  }
  const tokens = tokenReply.parse(json);
  return {
    accessToken: tokens.access_token,
    expiresAt: new Date(now.getTime() + tokens.expires_in * MS_PER_SECOND),
    ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
  };
}

export async function exchangeCode(
  client: GoogleClient,
  input: { code: string; redirectUri: string; now: Date },
): Promise<GoogleTokens> {
  const reply = await post(client, TOKEN_URL, {
    code: input.code,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
  });
  return readTokens(reply, input.now);
}

export async function refreshAccessToken(
  client: GoogleClient,
  input: { refreshToken: string; now: Date },
): Promise<GoogleTokens> {
  const reply = await post(client, TOKEN_URL, {
    refresh_token: input.refreshToken,
    grant_type: 'refresh_token',
  });
  return readTokens(reply, input.now);
}

/** Best effort: the user may already have revoked it. */
export async function revokeToken(client: GoogleClient, token: string): Promise<void> {
  await post(client, REVOKE_URL, { token }).catch(() => undefined);
}

export interface OwnedCalendar {
  id: string;
  name: string;
}

export async function listOwnedCalendars(
  accessToken: string,
  send: typeof fetch = fetch,
): Promise<OwnedCalendar[]> {
  const reply = await send(LIST_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((cause: unknown) => {
    throw new CalendarError(OAUTH_FAILED, { cause });
  });
  if (!reply.ok) throw new CalendarError(`${OAUTH_FAILED} (${String(reply.status)})`);
  const parsed = listReply.parse(await reply.json());
  return parsed.items
    .filter((item) => item.accessRole === OWNER_ROLE)
    .map((item) => ({ id: item.id, name: item.summary }));
}
