import { MS_PER_MINUTE } from '@app/core';
import { AppointmentStatus, type AppointmentCreator } from '../../generated/prisma/enums.ts';
import type { Db, Tx } from '../index.ts';
import { loadScope, slotsIn, type AgendaScope } from './availability.ts';
import {
  AgendaError,
  AgendaFailure,
  MAX_FUTURE_APPOINTMENTS,
  isExclusionViolation,
  type AgendaResult,
  type AppointmentView,
} from './types.ts';

// Spec 05: the appointments table is the source of truth; the exclusion constraint decides
// double bookings (A-10). Every function is one transaction, so a failure leaves nothing behind.

const LIVE = [AppointmentStatus.scheduled, AppointmentStatus.confirmed];
const ONE_MS = 1;

export interface BookRequest {
  tenantId: string;
  contactId: string;
  serviceId: string;
  startsAt: Date;
  /** One per turn and action: a retried call returns the first result. */
  key: string;
  createdBy: AppointmentCreator;
  now: Date;
}

export interface MoveRequest extends Omit<BookRequest, 'serviceId'> {
  appointmentId: string;
}

export interface CancelRequest {
  tenantId: string;
  contactId: string;
  appointmentId: string;
  now: Date;
}

export const bookAppointment = (db: Db, req: BookRequest) =>
  runAgenda(db, req.tenantId, (tx) => bookIn(tx, req));

/** RF-43: the old time is released only if the new one was written (one transaction). */
export const rescheduleAppointment = (db: Db, req: MoveRequest) =>
  runAgenda(db, req.tenantId, (tx) => moveIn(tx, req));

export const cancelAppointment = (db: Db, req: CancelRequest) =>
  runAgenda(db, req.tenantId, (tx) => cancelIn(tx, req));

export async function listUpcoming(
  db: Db,
  req: { tenantId: string; contactId: string; now: Date },
): Promise<AppointmentView[]> {
  const rows = await db.withTenant(req.tenantId, (tx) =>
    tx.appointment.findMany({
      where: { contactId: req.contactId, status: { in: LIVE }, startsAt: { gte: req.now } },
      include: { service: true },
      orderBy: { startsAt: 'asc' },
    }),
  );
  return rows.map(toView);
}

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
    },
    include: { service: true },
  });
  return toView(created);
}

async function moveIn(tx: Tx, req: MoveRequest): Promise<AppointmentView> {
  const done = await tx.appointment.findFirst({
    where: { idempotencyKey: req.key },
    include: { service: true },
  });
  if (done) return toView(done);
  const old = await ownedLive(tx, req);
  await assertNotice(tx, { startsAt: old.startsAt, now: req.now });
  await tx.appointment.update({
    where: { id: old.id },
    data: { status: AppointmentStatus.cancelled },
  });
  return bookIn(tx, { ...req, serviceId: old.serviceId });
}

async function cancelIn(tx: Tx, req: CancelRequest): Promise<AppointmentView> {
  const found = await tx.appointment.findFirst({
    where: { id: req.appointmentId, contactId: req.contactId },
    include: { service: true },
  });
  if (!found) throw new AgendaFailure(AgendaError.appointmentNotFound);
  if (found.status === AppointmentStatus.cancelled) return toView(found);
  await assertNotice(tx, { startsAt: found.startsAt, now: req.now });
  const updated = await tx.appointment.update({
    where: { id: found.id },
    data: { status: AppointmentStatus.cancelled },
    include: { service: true },
  });
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

/** RF-44: inside the notice window the patient is handed to the professional instead. */
async function assertNotice(tx: Tx, { startsAt, now }: { startsAt: Date; now: Date }) {
  const { cancelNoticeMinutes } = await loadScope(tx);
  if (startsAt.getTime() - now.getTime() < cancelNoticeMinutes * MS_PER_MINUTE)
    throw new AgendaFailure(AgendaError.tooLateToCancel);
}

async function assertBelowLimit(tx: Tx, { contactId, now }: BookRequest) {
  const count = await tx.appointment.count({
    where: { contactId, status: { in: LIVE }, startsAt: { gte: now } },
  });
  if (count >= MAX_FUTURE_APPOINTMENTS) throw new AgendaFailure(AgendaError.limitReached);
}

/** The slot must still come out of `availableSlots` (rules, time off, notice, other bookings). */
async function assertOffered(
  tx: Tx,
  {
    scope,
    req,
    durationMinutes,
  }: { scope: AgendaScope; req: BookRequest; durationMinutes: number },
) {
  const slots = await slotsIn(tx, {
    professionalId: scope.professionalId,
    timezone: scope.timezone,
    durationMinutes,
    from: req.startsAt,
    to: new Date(req.startsAt.getTime() + ONE_MS),
    now: req.now,
  });
  if (slots.some((slot) => slot.start.getTime() === req.startsAt.getTime())) return;
  const taken = await tx.appointment.count({
    where: {
      professionalId: scope.professionalId,
      status: { not: AppointmentStatus.cancelled },
      startsAt: { lt: new Date(req.startsAt.getTime() + durationMinutes * MS_PER_MINUTE) },
      endsAt: { gt: req.startsAt },
    },
  });
  throw new AgendaFailure(taken > 0 ? AgendaError.slotTaken : AgendaError.slotUnavailable);
}

function toView(row: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  service: { name: string };
}): AppointmentView {
  return {
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    serviceName: row.service.name,
    status: row.status,
  };
}
