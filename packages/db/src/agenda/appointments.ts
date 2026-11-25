import { MS_PER_MINUTE } from '@app/core';
import {
  AppointmentCreator,
  AppointmentStatus,
  CalendarSyncState,
} from '../../generated/prisma/enums.ts';
import type { Db, Tx } from '../index.ts';
import { finishBook, removeEvent } from '../calendar/sync.ts';
import type { CalendarLink } from '../calendar/link.ts';
import { withStageSync } from '../customers/sync.ts';
import { assertBelowLimit, assertNotice, assertOffered, LIVE } from './guards.ts';
import { loadScope } from './availability.ts';
import { toView } from './view.ts';
import { cancelPendingMessages, scheduleMessages } from '../reminders/schedule.ts';
import {
  AgendaError,
  AgendaFailure,
  isExclusionViolation,
  type AgendaResult,
  type AppointmentView,
} from './types.ts';

// Spec 05: the appointments table is the source of truth; the exclusion constraint decides
// double bookings (A-10). Every function is one transaction, so a failure leaves nothing behind.

export interface BookRequest {
  tenantId: string;
  contactId: string;
  serviceId: string;
  startsAt: Date;
  /** One per turn and action: a retried call returns the first result. */
  key: string;
  createdBy: AppointmentCreator;
  now: Date;
  /** The tenant's connected calendar (E-21): availability is revalidated against it and the event written. */
  calendar?: CalendarLink | undefined;
}

export interface MoveRequest extends Omit<BookRequest, 'serviceId'> {
  appointmentId: string;
}

export interface CancelRequest {
  /** The professional (human) is not bound by the patient's notice window (RF-44 is for patients). */
  createdBy?: AppointmentCreator;
  tenantId: string;
  contactId: string;
  appointmentId: string;
  now: Date;
  calendar?: CalendarLink | undefined;
}

export async function bookAppointment(db: Db, req: BookRequest) {
  const result = await runAgenda(
    db,
    req.tenantId,
    synced(req, (tx) => bookIn(tx, req)),
  );
  if (!result.ok) return result;
  return finishBook(db, req.calendar, { view: result.value, tenantId: req.tenantId });
}

/** RF-43: the old time is released only if the new one was written (one transaction). */
export async function rescheduleAppointment(db: Db, req: MoveRequest) {
  const moved = await runAgenda(
    db,
    req.tenantId,
    synced(req, (tx) => moveIn(tx, req)),
  );
  if (!moved.ok) return moved;
  const booked = await finishBook(db, req.calendar, { view: moved.value, tenantId: req.tenantId });
  if (booked.ok)
    await removeEvent(db, req.calendar, {
      tenantId: req.tenantId,
      appointmentId: req.appointmentId,
    });
  return booked;
}

export async function cancelAppointment(db: Db, req: CancelRequest) {
  const result = await runAgenda(
    db,
    req.tenantId,
    synced(req, (tx) => cancelIn(tx, req)),
  );
  if (result.ok)
    await removeEvent(db, req.calendar, {
      tenantId: req.tenantId,
      appointmentId: req.appointmentId,
    });
  return result;
}

/** The customer's stage history follows the booking, in the same transaction (spec 10, "Clientes"). */
const synced =
  <T>(req: { tenantId: string; contactId: string; now: Date }, work: (tx: Tx) => Promise<T>) =>
  (tx: Tx) =>
    withStageSync(tx, req, () => work(tx));

async function runAgenda<T>(
  db: Db,
  tenantId: string,
  work: (tx: Tx) => Promise<T>,
): Promise<AgendaResult<T>> {
  try {
    return { ok: true, value: await db.withTenant(tenantId, work) };
  } catch (error) {
    if (error instanceof AgendaFailure) return { ok: false, error: error.code };
    if (isExclusionViolation(error)) return { ok: false, error: AgendaError.slotTaken };
    throw error;
  }
}

async function bookIn(tx: Tx, req: BookRequest): Promise<AppointmentView> {
  const done = await tx.appointment.findFirst({
    where: { idempotencyKey: req.key },
    include: { service: true },
  });
  if (done) return toView(done);
  const scope = await loadScope(tx);
  const service = await tx.service.findFirst({ where: { id: req.serviceId, active: true } });
  if (!service) throw new AgendaFailure(AgendaError.serviceNotFound);
  await assertBelowLimit(tx, req);
  const endsAt = new Date(req.startsAt.getTime() + service.durationMinutes * MS_PER_MINUTE);
  await assertOffered(tx, { scope, req, durationMinutes: service.durationMinutes });
  const created = await tx.appointment.create({
    data: {
      tenantId: req.tenantId,
      professionalId: scope.professionalId,
      contactId: req.contactId,
      serviceId: service.id,
      locationId: scope.locationId,
      startsAt: req.startsAt,
      endsAt,
      createdBy: req.createdBy,
      idempotencyKey: req.key,
      calendarSync: req.calendar ? CalendarSyncState.failed : CalendarSyncState.none,
    },
    include: { service: true },
  });
  await scheduleMessages(tx, { tenantId: req.tenantId, appointment: created, now: req.now });
  return toView(created);
}

async function moveIn(tx: Tx, req: MoveRequest): Promise<AppointmentView> {
  const done = await tx.appointment.findFirst({
    where: { idempotencyKey: req.key },
    include: { service: true },
  });
  if (done) return toView(done);
  const old = await ownedLive(tx, req);
  if (req.createdBy !== AppointmentCreator.human)
    await assertNotice(tx, { startsAt: old.startsAt, now: req.now });
  await tx.appointment.update({
    where: { id: old.id },
    data: { status: AppointmentStatus.cancelled },
  });
  await cancelPendingMessages(tx, old.id);
  return bookIn(tx, { ...req, serviceId: old.serviceId });
}

async function cancelIn(tx: Tx, req: CancelRequest): Promise<AppointmentView> {
  const found = await tx.appointment.findFirst({
    where: { id: req.appointmentId, contactId: req.contactId },
    include: { service: true },
  });
  if (!found) throw new AgendaFailure(AgendaError.appointmentNotFound);
  if (found.status === AppointmentStatus.cancelled) return toView(found);
  if (req.createdBy !== AppointmentCreator.human)
    await assertNotice(tx, { startsAt: found.startsAt, now: req.now });
  const updated = await tx.appointment.update({
    where: { id: found.id },
    data: { status: AppointmentStatus.cancelled },
    include: { service: true },
  });
  await cancelPendingMessages(tx, found.id);
  return toView(updated);
}

async function ownedLive(tx: Tx, req: MoveRequest) {
  const found = await tx.appointment.findFirst({
    where: {
      id: req.appointmentId,
      contactId: req.contactId,
      status: { in: LIVE },
      startsAt: { gte: req.now },
    },
  });
  if (!found) throw new AgendaFailure(AgendaError.appointmentNotFound);
  return found;
}
