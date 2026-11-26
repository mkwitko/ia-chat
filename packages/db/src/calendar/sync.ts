import { eventIdFor, type CalendarEvent } from '@app/core';
import { CalendarSyncState } from '../../generated/prisma/enums.ts';
import { toView } from '../agenda/view.ts';
import { AgendaError, type AgendaResult, type AppointmentView } from '../agenda/types.ts';
import type { Db } from '../index.ts';
import type { CalendarLink } from './link.ts';

// Spec 05, E-21: the appointment row is written first (the exclusion constraint decides), then
// the Google event. The patient is confirmed only when both exist. Every write uses the event id
// derived from our appointment id, so a retry never duplicates.

const NAME_SEPARATOR = ' — ';

interface Target {
  tenantId: string;
  appointmentId: string;
}

async function eventOf(db: Db, { tenantId, appointmentId }: Target): Promise<CalendarEvent> {
  return db.withTenant(tenantId, async (tx) => {
    const row = await tx.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: { service: true, contact: true },
    });
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    return {
      id: eventIdFor(row.id),
      summary: [row.service.name, row.contact.name].filter(Boolean).join(NAME_SEPARATOR),
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      timeZone: tenant.timezone,
    };
  });
}

function mark(
  db: Db,
  target: Target,
  data: { calendarSync: CalendarSyncState; googleEventId?: string | null },
) {
  return db.withTenant(target.tenantId, (tx) =>
    tx.appointment.update({
      where: { id: target.appointmentId },
      data,
      include: { service: true, professional: true },
    }),
  );
}

/** Writes the event for a new appointment. On failure the row stays, flagged "não sincronizado". */
async function pushNew(
  db: Db,
  link: CalendarLink,
  target: Target,
): Promise<AppointmentView | null> {
  const event = await eventOf(db, target);
  try {
    await link.provider.insert({ calendarId: link.calendarId, event });
  } catch (error) {
    await link.onFailure(error);
    return null;
  }
  const row = await mark(db, target, {
    calendarSync: CalendarSyncState.synced,
    googleEventId: event.id,
  });
  return toView(row);
}

/**
 * The booking is only confirmed once Google has the event. A replay of an earlier call (same
 * idempotency key) whose event never reached Google tries again with the same event id.
 */
export async function finishBook(
  db: Db,
  link: CalendarLink | undefined,
  { view, tenantId }: { view: AppointmentView; tenantId: string },
): Promise<AgendaResult<AppointmentView>> {
  if (
    !link ||
    view.calendarSync === CalendarSyncState.synced ||
    view.calendarSync === CalendarSyncState.none
  )
    return { ok: true, value: view };
  const pushed = await pushNew(db, link, { tenantId, appointmentId: view.id });
  return pushed ? { ok: true, value: pushed } : { ok: false, error: AgendaError.notSynced };
}

/** Deletes the appointment's event, if it has one. A failure is flagged and retried later. */
export async function removeEvent(db: Db, link: CalendarLink | undefined, target: Target) {
  if (!link) return;
  const row = await db.withTenant(target.tenantId, (tx) =>
    tx.appointment.findUnique({ where: { id: target.appointmentId } }),
  );
  if (!row?.googleEventId) return;
  try {
    await link.provider.delete({ calendarId: link.calendarId, eventId: row.googleEventId });
  } catch (error) {
    await link.onFailure(error);
    await mark(db, target, { calendarSync: CalendarSyncState.failed });
    return;
  }
  await mark(db, target, { calendarSync: CalendarSyncState.none, googleEventId: null });
}
