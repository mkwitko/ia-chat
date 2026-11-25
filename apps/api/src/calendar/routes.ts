import { authorizationUrl, encryptToken, exchangeCode } from '@app/core';
import { CalendarStatus, googleClientOf } from '@app/db';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { tenantOf } from '../setup/guarded.ts';
import { registerCalendarChoiceRoutes } from './choice-routes.ts';
import { signState, verifyState } from './state.ts';

// E-21 / spec 05: connect Google Calendar by OAuth. The consent is bound to tenant and user by a
// signed `state`; the tokens are stored encrypted (spec 06).

const BASE = '/api/calendar/google';
const CALLBACK = `${BASE}/callback`;
const PANEL_PAGE = '/agenda/disponibilidade';

export const CalendarState = {
  off: 'off',
  notConnected: 'not_connected',
  chooseCalendar: 'choose_calendar',
  connected: 'connected',
  needsReconnect: 'needs_reconnect',
} as const;
type CalendarState = (typeof CalendarState)[keyof typeof CalendarState];

const Outcome = { connected: 'ok', failed: 'erro' } as const;
type Outcome = (typeof Outcome)[keyof typeof Outcome];
const CONNECT_FAILED = 'google calendar connect failed';

const callbackQuery = z.object({ code: z.string().min(1), state: z.string().min(1) });

export function registerCalendarRoutes(app: FastifyInstance): void {
  app.get(BASE, { preHandler: requireTenant(Permission.integrationsRead) }, status);
  app.post(
    `${BASE}/connect`,
    { preHandler: requireTenant(Permission.integrationsManage) },
    connect,
  );
  app.get(CALLBACK, callback);
  registerCalendarChoiceRoutes(app, BASE);
}

export function stateOf(
  row: { status: CalendarStatus; calendarId: string | null } | null,
  available: boolean,
): CalendarState {
  if (!available) return CalendarState.off;
  if (!row) return CalendarState.notConnected;
  if (row.status === CalendarStatus.needs_reconnect) return CalendarState.needsReconnect;
  return row.calendarId ? CalendarState.connected : CalendarState.chooseCalendar;
}

async function status(request: FastifyRequest) {
  const row = await tenantOf(request).withTenant((tx) => tx.calendarIntegration.findFirst());
  const available = request.server.calendar.options !== null;
  return { state: stateOf(row, available), calendarName: row?.calendarName ?? null };
}

function connect(request: FastifyRequest, reply: FastifyReply) {
  const options = request.server.calendar.options;
  if (!options) return reply.code(HttpStatus.unavailable).send({ error: ErrorCode.calendarOff });
  const { tenantId, userId } = tenantOf(request);
  const { secret, redirectUri } = request.server.calendar;
  const state = signState({ tenantId, userId, secret, now: new Date() });
  return { url: authorizationUrl({ clientId: options.config.clientId, redirectUri, state }) };
}

async function callback(request: FastifyRequest, reply: FastifyReply) {
  const { options, secret } = request.server.calendar;
  const query = callbackQuery.safeParse(request.query);
  const session = await request.server.auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  const bound = query.success
    ? verifyState({ state: query.data.state, secret, now: new Date() })
    : null;
  const valid =
    options &&
    session &&
    bound?.userId === session.user.id &&
    bound.tenantId === session.session.activeOrganizationId;
  if (!valid || !query.success) return reply.redirect(panelUrl(request, Outcome.failed));
  const connected = await connectTenant(request, {
    ...bound,
    options,
    code: query.data.code,
  });
  return reply.redirect(panelUrl(request, connected ? Outcome.connected : Outcome.failed));
}

/** Exchanges the code and stores the tokens; false (never an exception) when Google refuses. */
async function connectTenant(
  request: FastifyRequest,
  input: ConnectInput & { code: string },
): Promise<boolean> {
  const { options, code } = input;
  try {
    const tokens = await exchangeCode(googleClientOf(options), {
      code,
      redirectUri: request.server.calendar.redirectUri,
      now: new Date(),
    });
    const { refreshToken } = tokens;
    if (!refreshToken) return false;
    await store(request, { ...input, tokens: { ...tokens, refreshToken } });
    return true;
  } catch (error) {
    request.log.warn({ tenantId: input.tenantId, error: String(error) }, CONNECT_FAILED);
    return false;
  }
}

interface ConnectInput {
  tenantId: string;
  userId: string;
  options: NonNullable<FastifyInstance['calendar']['options']>;
}

function store(
  request: FastifyRequest,
  input: ConnectInput & {
    tokens: { accessToken: string; expiresAt: Date; refreshToken: string };
  },
) {
  const { tenantId, userId, options, tokens } = input;
  const key = options.config.tokenKey;
  const data = {
    status: CalendarStatus.connected,
    refreshTokenEnc: encryptToken(tokens.refreshToken, key),
    accessTokenEnc: encryptToken(tokens.accessToken, key),
    accessExpiresAt: tokens.expiresAt,
    connectedByUser: userId,
  };
  // The chosen calendar is kept when the same tenant reconnects.
  return request.server.db.withTenant(tenantId, (tx) =>
    tx.calendarIntegration.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    }),
  );
}

function panelUrl(request: FastifyRequest, outcome: Outcome): string {
  return `${request.server.calendar.webOrigin}${PANEL_PAGE}?google=${outcome}`;
}
