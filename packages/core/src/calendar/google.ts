import * as z from 'zod';
import type { Interval } from '../agenda/slots.ts';
import {
  CalendarAuthError,
  CalendarError,
  type CalendarEvent,
  type CalendarProvider,
  type CalendarRange,
} from './types.ts';

// Google Calendar API v3 over fetch (spec 05, E-21). Request shapes follow
// developers.google.com/workspace/calendar/api/v3/reference.

const API = 'https://www.googleapis.com/calendar/v3';
const REQUEST_TIMEOUT_MS = 4_000;
const Status = { unauthorized: 401, notFound: 404, conflict: 409, gone: 410 } as const;
const HTTP_ERROR = 'google calendar request failed';
const BAD_REPLY = 'google calendar sent an unreadable reply';
const FAILED_CALENDAR = 'google calendar could not read the calendar';

const busyReply = z.object({
  calendars: z.record(
    z.string(),
    z.object({
      busy: z.array(
        z.object({
          start: z.iso.datetime({ offset: true }),
          end: z.iso.datetime({ offset: true }),
        }),
      ),
      errors: z.array(z.unknown()).optional(),
    }),
  ),
});

export interface GoogleCalendarOptions {
  /** Returns a valid access token (refreshing it when needed). Throws CalendarAuthError if revoked. */
  getAccessToken: () => Promise<string>;
  fetch?: typeof fetch;
}

interface Call {
  method: string;
  path: string;
  body?: unknown;
  /** Statuses that count as success (idempotent retries). */
  accept?: number[];
}

export class GoogleCalendar implements CalendarProvider {
  private readonly options: GoogleCalendarOptions;

  constructor(options: GoogleCalendarOptions) {
    this.options = options;
  }

  async freeBusy({ calendarId, from, to }: CalendarRange): Promise<Interval[]> {
    const body = {
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: calendarId }],
    };
    const reply = await this.call({ method: 'POST', path: '/freeBusy', body });
    const parsed = busyReply.safeParse(await reply.json());
    const entry = parsed.success ? parsed.data.calendars[calendarId] : undefined;
    if (!entry) throw new CalendarError(BAD_REPLY);
    // A calendar that could not be read must never look free.
    if (entry.errors?.length) throw new CalendarError(FAILED_CALENDAR);
    return entry.busy.map((one) => ({ start: new Date(one.start), end: new Date(one.end) }));
  }

  async insert({ calendarId, event }: { calendarId: string; event: CalendarEvent }): Promise<void> {
    const path = `/calendars/${encodeURIComponent(calendarId)}/events`;
    await this.call({ method: 'POST', path, body: toBody(event), accept: [Status.conflict] });
  }

  async update({ calendarId, event }: { calendarId: string; event: CalendarEvent }): Promise<void> {
    const path = `/calendars/${encodeURIComponent(calendarId)}/events/${event.id}`;
    await this.call({ method: 'PATCH', path, body: toBody(event) });
  }

  async delete({ calendarId, eventId }: { calendarId: string; eventId: string }): Promise<void> {
    const path = `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
    await this.call({ method: 'DELETE', path, accept: [Status.notFound, Status.gone] });
  }

  private async call({ method, path, body, accept = [] }: Call): Promise<Response> {
    const token = await this.options.getAccessToken();
    const send = this.options.fetch ?? fetch;
    const reply = await send(`${API}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch((cause: unknown) => {
      throw new CalendarError(HTTP_ERROR, { cause });
    });
    if (reply.ok || accept.includes(reply.status)) return reply;
    if (reply.status === Status.unauthorized) throw new CalendarAuthError(HTTP_ERROR);
    throw new CalendarError(`${HTTP_ERROR} (${String(reply.status)})`);
  }
}

function toBody(event: CalendarEvent) {
  return {
    id: event.id,
    summary: event.summary,
    start: { dateTime: event.startsAt.toISOString(), timeZone: event.timeZone },
    end: { dateTime: event.endsAt.toISOString(), timeZone: event.timeZone },
  };
}
