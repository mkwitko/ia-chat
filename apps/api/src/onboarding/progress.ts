import {
  currentStep,
  parsePolicy,
  parseProgress,
  STEP_ORDER,
  SPECIALTY_OPTIONS,
  type OnboardingProgress,
} from '@app/core';
import type { Tx } from '@app/db';
import { documentSet, whatsappConnected } from './requirements.ts';

/** Saved onboarding progress of the tenant (server-side, so it resumes on any device). */
export async function readProgress(tx: Tx, tenantId: string): Promise<OnboardingProgress> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { onboardingProgress: true },
  });
  return parseProgress(tenant.onboardingProgress);
}

export async function saveProgress(
  tx: Tx,
  { tenantId, progress }: { tenantId: string; progress: OnboardingProgress },
): Promise<void> {
  await tx.tenant.update({ where: { id: tenantId }, data: { onboardingProgress: progress } });
}

export async function progressView(tx: Tx, tenantId: string) {
  const progress = await readProgress(tx, tenantId);
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { specialtyPolicy: { select: { rules: true } } },
  });
  return {
    steps: STEP_ORDER.map((step) => ({ step, status: progress.steps[step] ?? null })),
    current: currentStep(progress),
    specialty: progress.specialty ?? null,
    pricesForbidden: parsePolicy(tenant.specialtyPolicy?.rules).pricesForbidden,
    specialties: SPECIALTY_OPTIONS,
    documentSet: await documentSet(tx, tenantId),
    whatsappConnected: await whatsappConnected(tx),
  };
}
