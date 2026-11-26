import { OnboardingStep, StepStatus } from '@app/core';
import { ChannelStatus, type Tx } from '@app/db';
import { ErrorCode } from '../http.ts';

// Invite-only guided flow (H-37): the first step is the CPF/CNPJ (one trial per document, RF-81),
// and the assistant is activated only with the WhatsApp connected (H-22). Hours need a grid (H-39).

export async function whatsappConnected(tx: Tx): Promise<boolean> {
  return (await tx.channel.count({ where: { status: ChannelStatus.connected } })) > 0;
}

export async function hoursSet(tx: Tx): Promise<boolean> {
  return (await tx.availabilityRule.count()) > 0;
}

export async function documentSet(tx: Tx, tenantId: string): Promise<boolean> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { document: true },
  });
  return tenant.document !== null;
}

/** Why this step cannot be marked done yet, or null. Skipping never needs anything. */
export async function stepBlocked(
  tx: Tx,
  { tenantId, step, status }: { tenantId: string; step: OnboardingStep; status: StepStatus },
): Promise<ErrorCode | null> {
  if (status !== StepStatus.done) return null;
  switch (step) {
    case OnboardingStep.account:
      return (await documentSet(tx, tenantId)) ? null : ErrorCode.documentRequired;
    case OnboardingStep.whatsapp:
    case OnboardingStep.activation:
      return (await whatsappConnected(tx)) ? null : ErrorCode.whatsappNotConnected;
    // Without a weekly grid the assistant has no hours to state and no slot to offer.
    case OnboardingStep.hours:
      return (await hoursSet(tx)) ? null : ErrorCode.hoursRequired;
    default:
      return null;
  }
}
