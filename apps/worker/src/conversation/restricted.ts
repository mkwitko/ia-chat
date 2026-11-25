import { monthOf, PlanId, trialCapReached, usageStatus } from '@app/core';
import type { Tx } from '@app/db';
import { DeliveryMode, type TurnReply } from './turn-types.ts';

/** Spec 01: past the owner's overage cap the assistant only tells the patient to wait. */
export const RESTRICTED_MESSAGE =
  'Recebi a sua mensagem. O profissional vai te responder em breve.';

/**
 * True when no model call may be made (E-18): this month's overage passed the owner's cap, or a
 * trial reached its conversation cap (RF-81).
 */
export async function isRestricted(tx: Tx, tenantId: string): Promise<boolean> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { plan: true, overageCapCents: true, status: true },
  });
  const counter = await tx.usageCounter.findUnique({
    where: { tenantId_month: { tenantId, month: monthOf(new Date()) } },
  });
  const conversations = counter?.conversations ?? 0;
  if (trialCapReached({ status: tenant.status, conversations })) return true;
  if (tenant.overageCapCents === null) return false;
  return usageStatus({
    plan: PlanId[tenant.plan],
    conversations,
    capCents: tenant.overageCapCents,
  }).restricted;
}

/** No model call; the patient is told to wait and the conversation goes to the professional. */
export const restrictedReply = (): TurnReply => ({
  text: RESTRICTED_MESSAGE,
  model: 'none',
  costMicroUsd: 0n,
  mode: DeliveryMode.send,
  handoff: true,
});
