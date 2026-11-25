import { monthOf, PlanId, usageStatus } from '@app/core';
import type { Tx } from '@app/db';
import { DeliveryMode, type TurnReply } from './turn-types.ts';

/** Spec 01: past the owner's overage cap the assistant only tells the patient to wait. */
export const RESTRICTED_MESSAGE =
  'Recebi a sua mensagem. O profissional vai te responder em breve.';

/** True when this month's overage passed the cap: no model call may be made (E-18). */
export async function isRestricted(tx: Tx, tenantId: string): Promise<boolean> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { plan: true, overageCapCents: true },
  });
  if (tenant.overageCapCents === null) return false;
  const counter = await tx.usageCounter.findUnique({
    where: { tenantId_month: { tenantId, month: monthOf(new Date()) } },
  });
  return usageStatus({
    plan: PlanId[tenant.plan],
    conversations: counter?.conversations ?? 0,
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
