import * as z from 'zod';
import type { Tx } from '../index.ts';

// Confirmation rule (spec 04): a booking needs a slot the assistant offered in an EARLIER
// turn, i.e. the patient had a message in between to say yes. Offers live on the conversation.

const MAX_OFFERS = 24;

const offersSchema = z.array(
  z.object({ serviceId: z.string(), startsAt: z.string(), offeredAt: z.string() }),
);

export interface OfferedSlots {
  conversationId: string;
  serviceId: string;
  now: Date;
}

async function readOffers(tx: Tx, conversationId: string) {
  const row = await tx.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  return offersSchema.parse(row.offeredSlots);
}

export async function recordOffers(tx: Tx, offer: OfferedSlots & { slots: Date[] }) {
  const { conversationId, serviceId, now, slots } = offer;
  const fresh = slots.map((slot) => ({
    serviceId,
    startsAt: slot.toISOString(),
    offeredAt: now.toISOString(),
  }));
  const kept = [...(await readOffers(tx, conversationId)), ...fresh].slice(-MAX_OFFERS);
  await tx.conversation.update({ where: { id: conversationId }, data: { offeredSlots: kept } });
}

/** True when the slot was offered before `turnStartedAt` (never in the current turn). */
export async function wasOfferedBefore(
  tx: Tx,
  { conversationId, serviceId, startsAt, turnStartedAt }: OfferCheck,
): Promise<boolean> {
  const offers = await readOffers(tx, conversationId);
  return offers.some(
    (offer) =>
      offer.serviceId === serviceId &&
      new Date(offer.startsAt).getTime() === startsAt.getTime() &&
      new Date(offer.offeredAt) < turnStartedAt,
  );
}

export interface OfferCheck {
  conversationId: string;
  serviceId: string;
  startsAt: Date;
  turnStartedAt: Date;
}
