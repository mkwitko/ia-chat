import { MS_PER_MINUTE } from '@app/core';
import { AppointmentStatus } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';
import { loadScope, slotsIn, type AgendaScope } from './availability.ts';
import type { BookRequest, MoveRequest } from './appointments.ts';
import { performersOf } from './professionals.ts';
import { AgendaError, AgendaFailure, MAX_FUTURE_APPOINTMENTS } from './types.ts';

// The rules a booking or a cancellation must pass (spec 05).

export const LIVE = [AppointmentStatus.scheduled, AppointmentStatus.confirmed];
const ONE_MS = 1;

/** RF-44: inside the notice window the patient is handed to the professional instead. */
export async function assertNotice(tx: Tx, { startsAt, now }: { startsAt: Date; now: Date }) {
  const { cancelNoticeMinutes } = await loadScope(tx);
  if (startsAt.getTime() - now.getTime() < cancelNoticeMinutes * MS_PER_MINUTE)
    throw new AgendaFailure(AgendaError.tooLateToCancel);
}

export async function assertBelowLimit(tx: Tx, { contactId, now }: BookRequest) {
  const count = await tx.appointment.count({
    where: { contactId, status: { in: LIVE }, startsAt: { gte: now } },
  });
  if (count >= MAX_FUTURE_APPOINTMENTS) throw new AgendaFailure(AgendaError.limitReached);
}

interface OfferedCheck {
  scope: AgendaScope;
  req: BookRequest;
  durationMinutes: number;
  /** Who may take the slot, in order of preference (spec 05, "Agenda por profissional"). */
  candidates: readonly string[];
}

/**
 * The first candidate for whom the slot still comes out of `availableSlots` (rules, time off,
 * notice, other bookings). None: slot_taken when a booking holds it, else unavailable.
 */
async function offeredProfessional(
  tx: Tx,
  { scope, req, durationMinutes, candidates }: OfferedCheck,
): Promise<string> {
  for (const professionalId of candidates) {
    const slots = await slotsIn(tx, {
      professionalId,
      timezone: scope.timezone,
      durationMinutes,
      calendar: req.calendar,
      from: req.startsAt,
      to: new Date(req.startsAt.getTime() + ONE_MS),
      now: req.now,
    });
    if (slots.some((slot) => slot.start.getTime() === req.startsAt.getTime())) return professionalId;
  }
  const taken = await tx.appointment.count({
    where: {
      professionalId: { in: [...candidates] },
      status: { not: AppointmentStatus.cancelled },
      startsAt: { lt: new Date(req.startsAt.getTime() + durationMinutes * MS_PER_MINUTE) },
      endsAt: { gt: req.startsAt },
    },
  });
  throw new AgendaFailure(taken > 0 ? AgendaError.slotTaken : AgendaError.slotUnavailable);
}

/** Who takes the booking: the requested professional, else the first free performer (H-42). */
export async function professionalFor(
  tx: Tx,
  { scope, req, service }: { scope: AgendaScope; req: BookRequest; service: ServiceRow },
): Promise<string> {
  const candidates = await performersOf(tx, {
    serviceId: service.id,
    professionalId: req.professionalId,
  });
  if (candidates.length === 0) throw new AgendaFailure(AgendaError.professionalNotFound);
  return offeredProfessional(tx, {
    scope,
    req,
    durationMinutes: service.durationMinutes,
    candidates: candidates.map((one) => one.id),
  });
}

interface ServiceRow {
  id: string;
  durationMinutes: number;
}

/** The patient's live future appointment being moved. */
export async function ownedLive(tx: Tx, req: MoveRequest) {
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
