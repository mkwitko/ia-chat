import { overlaps, type Interval } from '../agenda/slots.ts';
import {
  CalendarAuthError,
  CalendarError,
  type CalendarEvent,
  type CalendarProvider,
  type CalendarRange,
} from './types.ts';

export const FakeFailure = { auth: 'auth', down: 'down' } as const;
type FakeFailure = (typeof FakeFailure)[keyof typeof FakeFailure];

interface EventInput {
  calendarId: string;
  event: CalendarEvent;
}

/** In-memory provider for tests: no network. Failures are switched on by the test. */
export class FakeCalendar implements CalendarProvider {
  readonly events = new Map<string, CalendarEvent>();
  /** Intervals other calendar users have busy (outside our own events). */
  externalBusy: Interval[] = [];
  /** `insert` calls that reached the provider, including repeats of the same id. */
  insertCalls = 0;
  failWith: FakeFailure | null = null;

  private check(): void {
    if (this.failWith === FakeFailure.auth) throw new CalendarAuthError(FakeFailure.auth);
    if (this.failWith === FakeFailure.down) throw new CalendarError(FakeFailure.down);
  }

  freeBusy({ from, to }: CalendarRange): Promise<Interval[]> {
    return Promise.resolve().then(() => {
      this.check();
      const own = [...this.events.values()].map((e) => ({ start: e.startsAt, end: e.endsAt }));
      const range = { start: from, end: to };
      return [...own, ...this.externalBusy].filter((busy) => overlaps(busy, range));
    });
  }

  insert({ event }: EventInput): Promise<void> {
    return Promise.resolve().then(() => {
      this.insertCalls += 1;
      this.check();
      if (!this.events.has(event.id)) this.events.set(event.id, event);
    });
  }

  update({ event }: EventInput): Promise<void> {
    return Promise.resolve().then(() => {
      this.check();
      this.events.set(event.id, event);
    });
  }

  delete({ eventId }: { calendarId: string; eventId: string }): Promise<void> {
    return Promise.resolve().then(() => {
      this.check();
      this.events.delete(eventId);
    });
  }
}
