import { MS_PER_MINUTE } from '@app/core';
import { AppointmentStatus, SlotOfferState, WaitlistStatus } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';
import { loadScope, slotsIn, type AgendaScope } from './availability.ts';

// M-09 (spec 05, "Lista de espera"): a cancelled future appointment frees its start time; the
// worker offers it to the oldest matching entry, one open offer per slot (partial unique index),
// and after OFFER_TTL_MINUTES to the next. Everything is derived from the rows, so a sweep that
// runs twice, or after a crash, offers nothing twice.

export const OFFER_TTL_MINUTES = 30;
const ONE_MS = 1;

/** Open offers past their time and requests past their window are closed. */
export async function expireWaitlist(tx: Tx, now: Date): Promise<void> {
  await tx.slotOffer.updateMany({
    where: { state: SlotOfferState.open, expiresAt: { lte: now } },
    data: { state: SlotOfferState.expired },
  });
  await tx.slotWaitlistEntry.updateMany({
    where: { status: WaitlistStatus.waiting, windowEnd: { lte: now } },
    data: { status: WaitlistStatus.expired },
  });
}

/** Start times of cancelled future appointments, not booked again and not under an open offer. */
export async function freedSlots(tx: Tx, now: Date): Promise<Date[]> {
  const cancelled = await tx.appointment.findMany({
    where: { status: AppointmentStatus.cancelled, startsAt: { gt: now } },
    distinct: ['startsAt'],
    orderBy: { startsAt: 'asc' },
    select: { startsAt: true },
  });
  const starts = cancelled.map((row) => row.startsAt);
  const [taken, open] = await Promise.all([
    tx.appointment.findMany({
      where: { status: { not: AppointmentStatus.cancelled }, startsAt: { in: starts } },
      select: { startsAt: true },
    }),
    tx.slotOffer.findMany({
      where: { state: SlotOfferState.open, startsAt: { in: starts } },
      select: { startsAt: true },
    }),
  ]);
  const busy = new Set([...taken, ...open].map((row) => row.startsAt.getTime()));
  return starts.filter((start) => !busy.has(start.getTime()));
}

export interface ClaimedOffer {
  offerId: string;
  entryId: string;
  contactId: string;
  serviceId: string;
  serviceName: string;
  startsAt: Date;
  expiresAt: Date;
}

/**
 * Opens an offer of `startsAt` for the oldest waiting entry whose window covers it, that was never
 * offered this slot and whose service still fits there. Null when nobody matches. A concurrent
 * open offer for the same slot makes the insert fail (the caller's transaction rolls back).
 */
export async function claimSlotOffer(
  tx: Tx,
  { startsAt, now }: { startsAt: Date; now: Date },
): Promise<ClaimedOffer | null> {
  const entries = await tx.slotWaitlistEntry.findMany({
    where: {
      status: WaitlistStatus.waiting,
      windowStart: { lte: startsAt },
      windowEnd: { gt: startsAt },
      offers: { none: { startsAt } },
    },
    orderBy: { createdAt: 'asc' },
    include: { service: true },
  });
  if (entries.length === 0) return null;
  const scope = await loadScope(tx);
  for (const entry of entries) {
    const fits = await slotFree(tx, {
      scope,
      startsAt,
      now,
      durationMinutes: entry.service.durationMinutes,
    });
    if (!fits) continue;
    const expiresAt = new Date(now.getTime() + OFFER_TTL_MINUTES * MS_PER_MINUTE);
    const offer = await tx.slotOffer.create({
      data: { tenantId: entry.tenantId, entryId: entry.id, startsAt, expiresAt },
    });
    return {
      offerId: offer.id,
      entryId: entry.id,
      contactId: entry.contactId,
      serviceId: entry.serviceId,
      serviceName: entry.service.name,
      startsAt,
      expiresAt,
    };
  }
  return null;
}

/** The offer could not go out (window, human control, opt-out); opt-out also drops the request. */
export async function skipSlotOffer(
  tx: Tx,
  { offerId, dropEntry }: { offerId: string; dropEntry: boolean },
): Promise<void> {
  const offer = await tx.slotOffer.update({
    where: { id: offerId },
    data: { state: SlotOfferState.skipped },
  });
  if (dropEntry)
    await tx.slotWaitlistEntry.update({
      where: { id: offer.entryId },
      data: { status: WaitlistStatus.removed },
    });
}

interface FreeCheck {
  scope: AgendaScope;
  startsAt: Date;
  now: Date;
  durationMinutes: number;
}

/** ponytail: Google busy time is not read here; bookAppointment checks it before anything is booked. */
async function slotFree(tx: Tx, { scope, startsAt, now, durationMinutes }: FreeCheck) {
  const slots = await slotsIn(tx, {
    professionalId: scope.professionalId,
    timezone: scope.timezone,
    durationMinutes,
    from: startsAt,
    to: new Date(startsAt.getTime() + ONE_MS),
    now,
  });
  return slots.some((slot) => slot.start.getTime() === startsAt.getTime());
}
