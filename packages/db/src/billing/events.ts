import { toProviderPayment, type AsaasWebhookEvent } from '@app/core';
import { Prisma } from '../../generated/prisma/client.ts';
import type { Db } from '../index.ts';
import { applyPayment, markSubscriptionCancelled } from './apply.ts';

const UNIQUE_VIOLATION = 'P2002';
const SUBSCRIPTION_DELETED = 'SUBSCRIPTION_DELETED';

export const EventOutcome = { applied: 'applied', duplicate: 'duplicate' } as const;
export type EventOutcome = (typeof EventOutcome)[keyof typeof EventOutcome];

/** True when this delivery should be applied: new, or stored earlier but never applied. */
async function claim(db: Db, event: AsaasWebhookEvent): Promise<boolean> {
  const known = await db.client.billingEvent.findUnique({ where: { id: event.id } });
  if (known) return known.processedAt === null;
  try {
    await db.client.billingEvent.create({ data: { id: event.id, type: event.event } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION)
      return false;
    throw error;
  }
}

/**
 * Stores the event id first, so a retried delivery (Asaas retries until it gets a 200) is
 * recognised, then applies it. An event stored but not applied is applied again on the retry.
 */
export async function handleBillingEvent(db: Db, event: AsaasWebhookEvent): Promise<EventOutcome> {
  if (!(await claim(db, event))) return EventOutcome.duplicate;
  if (event.payment) await applyPayment(db.client, toProviderPayment(event.payment));
  else if (event.event === SUBSCRIPTION_DELETED && event.subscription)
    await markSubscriptionCancelled(db.client, event.subscription.id);
  await db.client.billingEvent.update({
    where: { id: event.id },
    data: { processedAt: new Date() },
  });
  return EventOutcome.applied;
}
