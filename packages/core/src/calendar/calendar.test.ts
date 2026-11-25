import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { eventIdFor } from './event-id.ts';
import { GoogleCalendar } from './google.ts';
import { authorizationUrl, GOOGLE_SCOPES, refreshAccessToken } from './oauth.ts';
import { decryptToken, encryptToken } from './token-crypto.ts';
import { CalendarAuthError, CalendarError } from './types.ts';

const KEY = randomBytes(32).toString('base64');
const event = {
  id: eventIdFor('0192f5a0-1b2c-7d3e-8f40-123456789abc'),
  summary: 'Sessão',
  startsAt: new Date('2027-01-04T12:00:00Z'),
  endsAt: new Date('2027-01-04T13:00:00Z'),
  timeZone: 'America/Sao_Paulo',
};

const reply = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status });

function provider(handler: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const send: typeof fetch = (input, init = {}) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, init });
    return Promise.resolve(handler(url, init));
  };
  const google = new GoogleCalendar({
    getAccessToken: () => Promise.resolve('access'),
    fetch: send,
  });
  return { google, calls };
}

describe('token crypto', () => {
  it('round-trips and never stores the plain token', () => {
    const stored = encryptToken('refresh-secret', KEY);
    expect(stored).not.toContain('refresh-secret');
    expect(decryptToken(stored, KEY)).toBe('refresh-secret');
  });

  it('fails on a tampered value or another key', () => {
    const stored = encryptToken('x', KEY);
    expect(() => decryptToken(stored, randomBytes(32).toString('base64'))).toThrow();
    expect(() => decryptToken(`${stored}0`, KEY)).toThrow();
    expect(() => encryptToken('x', 'short')).toThrow();
  });
});

describe('event id', () => {
  it('is base32hex-safe and deterministic', () => {
    expect(event.id).toMatch(/^[0-9a-v]{5,1024}$/);
    expect(eventIdFor('0192F5A0-1B2C-7D3E-8F40-123456789ABC')).toBe(event.id);
  });
});

describe('GoogleCalendar', () => {
  it('reads busy intervals from freeBusy.query', async () => {
    const { google, calls } = provider(() =>
      reply(200, {
        calendars: {
          cal: { busy: [{ start: '2027-01-04T12:00:00Z', end: '2027-01-04T13:00:00Z' }] },
        },
      }),
    );
    const busy = await google.freeBusy({
      calendarId: 'cal',
      from: new Date('2027-01-04T00:00:00Z'),
      to: new Date('2027-01-05T00:00:00Z'),
    });
    expect(busy).toEqual([{ start: event.startsAt, end: event.endsAt }]);
    expect(calls[0]?.url).toBe('https://www.googleapis.com/calendar/v3/freeBusy');
  });

  it('never treats an unreadable calendar as free', async () => {
    const { google } = provider(() =>
      reply(200, { calendars: { cal: { busy: [], errors: [{ reason: 'notFound' }] } } }),
    );
    const range = { calendarId: 'cal', from: event.startsAt, to: event.endsAt };
    await expect(google.freeBusy(range)).rejects.toBeInstanceOf(CalendarError);
  });

  it('insert sends the deterministic id; a 409 (same id again) is success', async () => {
    const { google, calls } = provider(() => reply(409));
    await google.insert({ calendarId: 'a@b.c', event });
    const body = JSON.parse(calls[0]?.init.body as string) as { id: string };
    expect(body.id).toBe(event.id);
    expect(calls[0]?.url).toContain('/calendars/a%40b.c/events');
  });

  it('delete of an event already gone is success; a 401 asks for reconnection', async () => {
    const gone = provider(() => reply(410));
    await expect(
      gone.google.delete({ calendarId: 'c', eventId: event.id }),
    ).resolves.toBeUndefined();
    const revoked = provider(() => reply(401));
    await expect(revoked.google.insert({ calendarId: 'c', event })).rejects.toBeInstanceOf(
      CalendarAuthError,
    );
  });

  it('a server error is a plain CalendarError', async () => {
    const { google } = provider(() => reply(500));
    await expect(google.update({ calendarId: 'c', event })).rejects.toBeInstanceOf(CalendarError);
  });
});

describe('oauth', () => {
  it('asks for the minimal scopes, offline access and carries the state', () => {
    const url = new URL(
      authorizationUrl({ clientId: 'id', redirectUri: 'https://api.test/cb', state: 's1' }),
    );
    expect(url.searchParams.get('scope')).toBe(GOOGLE_SCOPES.join(' '));
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('state')).toBe('s1');
  });

  it('invalid_grant on refresh means the token was revoked', async () => {
    const send: typeof fetch = () => Promise.resolve(reply(400, { error: 'invalid_grant' }));
    await expect(
      refreshAccessToken(
        { clientId: 'i', clientSecret: 's', fetch: send },
        { refreshToken: 'r', now: new Date() },
      ),
    ).rejects.toBeInstanceOf(CalendarAuthError);
  });
});
