import type { Interval } from '../agenda/slots.ts';

// Spec 05 / E-21: Google Calendar is the source of availability for the pilot. The agenda only
// needs four calls; everything else (channels, sync tokens) is deliberately not here.

export interface CalendarEvent {
  /** Deterministic from the appointment id (`eventIdFor`): a retried insert never duplicates. */
  id: string;
  summary: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
}

export interface CalendarRange {
  calendarId: string;
  from: Date;
  to: Date;
}

export interface CalendarProvider {
  /** Busy intervals of the calendar inside the range (`freeBusy.query`). */
  freeBusy(range: CalendarRange): Promise<Interval[]>;
  /** Idempotent: an event that already exists with this id counts as written. */
  insert(input: { calendarId: string; event: CalendarEvent }): Promise<void>;
  update(input: { calendarId: string; event: CalendarEvent }): Promise<void>;
  /** Idempotent: an event that is already gone counts as deleted. */
  delete(input: { calendarId: string; eventId: string }): Promise<void>;
}

/** The token was revoked or expired for good: the integration needs the user to reconnect. */
export class CalendarAuthError extends Error {}

/** Google failed or was unreachable; nothing says the token is bad. */
export class CalendarError extends Error {}
