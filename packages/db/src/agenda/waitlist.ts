import { AppointmentStatus, SlotOfferState, WaitlistStatus } from '../../generated/prisma/enums.ts';
import type { Db, Tx } from '../index.ts';

// M-09 (spec 05, "Lista de espera"): the client's request and what closes it. The offers sent
// from it live in slot-offers.ts; booking goes through bookAppointment like any other.

export interface JoinRequest {
  tenantId: string;
  contactId: string;
  serviceId: string;
  windowStart: Date;
  windowEnd: Date;
}

/** One waiting entry per client and service: asking again moves the window (partial unique index). */
export async function joinWaitlist(db: Db, req: JoinRequest) {
  const { tenantId, contactId, serviceId, windowStart, windowEnd } = req;
  return db.withTenant(tenantId, async (tx) => {
    const current = await tx.slotWaitlistEntry.findFirst({
      where: { contactId, serviceId, status: WaitlistStatus.waiting },
    });
    if (current)
      return tx.slotWaitlistEntry.update({
        where: { id: current.id },
        data: { windowStart, windowEnd },
      });
    return tx.slotWaitlistEntry.create({
      data: { tenantId, contactId, serviceId, windowStart, windowEnd },
    });
  });
}

/** The owner takes a client off the list (panel). */
export async function removeWaitlistEntry(tx: Tx, id: string): Promise<boolean> {
  const { count } = await tx.slotWaitlistEntry.updateMany({
    where: { id, status: WaitlistStatus.waiting },
    data: { status: WaitlistStatus.removed },
  });
  await tx.slotOffer.updateMany({
    where: { entryId: id, state: SlotOfferState.open },
    data: { state: SlotOfferState.expired },
  });
  return count > 0;
}

/** Waiting entries whose window touches [start, end): what the Agenda shows per day. */
export function waitlistBetween(tx: Tx, { start, end }: { start: Date; end: Date }) {
  return tx.slotWaitlistEntry.findMany({
    where: { status: WaitlistStatus.waiting, windowStart: { lt: end }, windowEnd: { gt: start } },
    orderBy: { createdAt: 'asc' },
    include: { service: true, contact: true },
  });
}

interface Booked {
  contactId: string;
  serviceId: string;
  startsAt: Date;
}

/** In the booking's transaction: a slot inside the client's window closes the request. */
export async function settleWaitlist(tx: Tx, { contactId, serviceId, startsAt }: Booked) {
  await tx.slotOffer.updateMany({
    where: { startsAt, state: SlotOfferState.open, entry: { contactId } },
    data: { state: SlotOfferState.accepted },
  });
  await tx.slotWaitlistEntry.updateMany({
    where: {
      contactId,
      serviceId,
      status: WaitlistStatus.waiting,
      windowStart: { lte: startsAt },
      windowEnd: { gt: startsAt },
    },
    data: { status: WaitlistStatus.booked },
  });
}

/**
 * Metric 8: a client who cancelled an upcoming appointment and books again is rebooking it.
 * ponytail: a cancel by the owner counts too (same client coming back); per-cause tracking if asked.
 */
export async function rebookSource(tx: Tx, { contactId, now }: { contactId: string; now: Date }) {
  const found = await tx.appointment.findFirst({
    where: {
      contactId,
      status: AppointmentStatus.cancelled,
      startsAt: { gt: now },
      rescheduledTo: { is: null },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  return found?.id ?? null;
}
