import { MS_PER_MINUTE } from '@app/core';
import { AppointmentStatus } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';
import { loadScope, slotsIn, type AgendaScope } from './availability.ts';
import type { BookRequest } from './appointments.ts';
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

/** The slot must still come out of `availableSlots` (rules, time off, notice, other bookings). */
export async function assertOffered(
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
    calendar: req.calendar,
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
