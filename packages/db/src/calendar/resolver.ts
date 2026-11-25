import {
  CalendarAuthError,
  GoogleCalendar,
  decryptToken,
  encryptToken,
  refreshAccessToken,
  type GoogleCalendarConfig,
  type GoogleClient,
  type CalendarProvider,
} from '@app/core';
import { AlertEvent, type Alert } from '@app/observability';
import { CalendarStatus } from '../../generated/prisma/enums.ts';
import type { Db } from '../index.ts';
import type { CalendarLink, CalendarResolver } from './link.ts';

// Turns the stored (encrypted) integration into a ready CalendarLink. A dead token flips the
// integration to `needs_reconnect` once and tells the operator; from then on the link refuses
// every call, so the assistant offers no slots until the professional reconnects (A-13).

const EXPIRY_MARGIN_MS = 60_000;

export interface ResolverOptions {
  db: Db;
  config: GoogleCalendarConfig;
  /** Raised once, when the integration goes from connected to needs_reconnect. */
  alert?: Alert;
  fetch?: typeof fetch;
  now?: () => Date;
}

interface Stored {
  tenantId: string;
  refreshTokenEnc: string;
  accessTokenEnc: string | null;
  accessExpiresAt: Date | null;
}

const REVOKED = 'google calendar needs to be reconnected';

/** Every call fails with CalendarAuthError: the integration is waiting for the user to reconnect. */
const refusing: CalendarProvider = {
  freeBusy: () => Promise.reject(new CalendarAuthError(REVOKED)),
  insert: () => Promise.reject(new CalendarAuthError(REVOKED)),
  update: () => Promise.reject(new CalendarAuthError(REVOKED)),
  delete: () => Promise.reject(new CalendarAuthError(REVOKED)),
};

export function createCalendarResolver(options: ResolverOptions): CalendarResolver {
  return async (tenantId) => {
    const row = await options.db.withTenant(tenantId, (tx) =>
      tx.calendarIntegration.findUnique({ where: { tenantId } }),
    );
    if (!row) return null;
    // Connected but no calendar chosen yet counts as unavailable: Google is the source of availability.
    if (!row.calendarId || row.status !== CalendarStatus.connected)
      return linkFor(row.calendarId ?? '', refusing, noop);
    const provider = new GoogleCalendar({
      getAccessToken: () => accessToken(options, row),
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });
    return linkFor(row.calendarId, provider, (error) => markIfRevoked(options, tenantId, error));
  };
}

/** OAuth client of the Google app, with the test seam `fetch`. */
export const googleClientOf = ({ config, fetch }: ResolverOptions): GoogleClient => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  ...(fetch ? { fetch } : {}),
});

const noop = () => Promise.resolve();

const linkFor = (
  calendarId: string,
  provider: CalendarProvider,
  onFailure: CalendarLink['onFailure'],
): CalendarLink => ({ provider, calendarId, onFailure });

async function accessToken(options: ResolverOptions, row: Stored): Promise<string> {
  const { config } = options;
  const now = options.now?.() ?? new Date();
  const fresh =
    row.accessExpiresAt && row.accessExpiresAt.getTime() - now.getTime() > EXPIRY_MARGIN_MS;
  if (row.accessTokenEnc && fresh) return decryptToken(row.accessTokenEnc, config.tokenKey);
  const tokens = await refreshAccessToken(googleClientOf(options), {
    refreshToken: decryptToken(row.refreshTokenEnc, config.tokenKey),
    now,
  });
  await options.db.withTenant(row.tenantId, (tx) =>
    tx.calendarIntegration.update({
      where: { tenantId: row.tenantId },
      data: {
        accessTokenEnc: encryptToken(tokens.accessToken, config.tokenKey),
        accessExpiresAt: tokens.expiresAt,
      },
    }),
  );
  return tokens.accessToken;
}

async function markIfRevoked(options: ResolverOptions, tenantId: string, error: unknown) {
  if (!(error instanceof CalendarAuthError)) return;
  const changed = await options.db.withTenant(tenantId, (tx) =>
    tx.calendarIntegration.updateMany({
      where: { tenantId, status: CalendarStatus.connected },
      data: { status: CalendarStatus.needs_reconnect },
    }),
  );
  if (changed.count > 0) options.alert?.(AlertEvent.calendarDisconnected, { tenantId });
}

/** A valid access token for the panel's own calls (listing calendars); null when not connected. */
export async function calendarAccessToken(
  options: ResolverOptions,
  tenantId: string,
): Promise<string | null> {
  const row = await options.db.withTenant(tenantId, (tx) =>
    tx.calendarIntegration.findUnique({ where: { tenantId } }),
  );
  if (row?.status !== CalendarStatus.connected) return null;
  try {
    return await accessToken(options, row);
  } catch (error) {
    await markIfRevoked(options, tenantId, error);
    throw error;
  }
}
