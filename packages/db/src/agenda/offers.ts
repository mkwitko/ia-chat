import * as z from 'zod';
import type { Tx } from '../index.ts';

// Confirmation rule (spec 04): a booking needs a slot the assistant offered in an EARLIER
// turn, i.e. the patient had a message in between to say yes. Offers live on the conversation.

const MAX_OFFERS = 24;

const offersSchema = z.array(
  z.object({
    serviceId: z.string(),
    startsAt: z.string(),
    offeredAt: z.string(),
    /** Who the slot was offered with; absent on offers recorded before per-professional agendas. */
    professionalId: z.string().optional(),
  }),
);
type Offer = z.infer<typeof offersSchema>[number];

export interface OfferedSlot {
  start: Date;
  professionalId?: string | undefined;
}

export interface OfferedSlots {
  conversationId: string;
  serviceId: string;
  now: Date;
}

async function readOffers(tx: Tx, conversationId: string) {
  const row = await tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  return offersSchema.parse(row.offeredSlots);
}

export async function recordOffers(tx: Tx, offer: OfferedSlots & { slots: OfferedSlot[] }) {
  const { conversationId, serviceId, now, slots } = offer;
  const fresh = slots.map((slot) => ({
    serviceId,
    startsAt: slot.start.toISOString(),
    offeredAt: now.toISOString(),
    ...(slot.professionalId ? { professionalId: slot.professionalId } : {}),
  }));
  const kept = [...(await readOffers(tx, conversationId)), ...fresh].slice(-MAX_OFFERS);
  await tx.conversation.update({ where: { id: conversationId }, data: { offeredSlots: kept } });
}

/**
 * The offer of this slot made before `turnStartedAt` (never in the current turn), latest first.
 * With `professionalId`, an offer made with another professional does not count.
 */
export async function offeredBefore(tx: Tx, check: OfferCheck): Promise<Offer | undefined> {
  const { conversationId, serviceId, startsAt, turnStartedAt, professionalId } = check;
  const offers = await readOffers(tx, conversationId);
  return offers.findLast(
    (offer) =>
      offer.serviceId === serviceId &&
      new Date(offer.startsAt).getTime() === startsAt.getTime() &&
      new Date(offer.offeredAt) < turnStartedAt &&
      (!professionalId || !offer.professionalId || offer.professionalId === professionalId),
  );
}

/** True when the slot was offered before `turnStartedAt` (never in the current turn). */
export async function wasOfferedBefore(tx: Tx, check: OfferCheck): Promise<boolean> {
  return (await offeredBefore(tx, check)) !== undefined;
}

export interface OfferCheck {
  conversationId: string;
  serviceId: string;
  startsAt: Date;
  turnStartedAt: Date;
  professionalId?: string | undefined;
}
