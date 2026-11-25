import { type CalendarProvider, type Interval } from '@app/core';
import { AgendaError, AgendaFailure } from '../agenda/types.ts';

/** A tenant's connected calendar, ready to call. Absent (undefined) means "our rules only". */
export interface CalendarLink {
  provider: CalendarProvider;
  calendarId: string;
  /** Told about every failed call; marks the integration when the token is dead for good. */
  onFailure: (error: unknown) => Promise<void>;
}

/** Null when the tenant has no calendar connected and chosen. */
export type CalendarResolver = (tenantId: string) => Promise<CalendarLink | null>;

/**
 * Busy intervals of the connected calendar, or none without one. A calendar that cannot be read
 * must not look free (spec 05, A-13): the caller gets `calendarUnavailable` and offers nothing.
 */
export async function externalBusyOf(
  link: CalendarLink | undefined,
  range: { from: Date; to: Date },
): Promise<Interval[]> {
  if (!link) return [];
  try {
    return await link.provider.freeBusy({ calendarId: link.calendarId, ...range });
  } catch (error) {
    await link.onFailure(error);
    throw new AgendaFailure(AgendaError.calendarUnavailable);
  }
}
