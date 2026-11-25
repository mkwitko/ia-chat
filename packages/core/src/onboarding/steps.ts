import * as z from 'zod';

// Spec 09, "Cadastro e ativação sem ajuda": the steps, in order. Owner decision (25/11/2026, H-37):
// CPF/CNPJ, WhatsApp, Google, then services and the rest, simulator, activation.

export const OnboardingStep = {
  account: 'account',
  whatsapp: 'whatsapp',
  google: 'google',
  services: 'services',
  location: 'location',
  tone: 'tone',
  simulator: 'simulator',
  activation: 'activation',
} as const;
export type OnboardingStep = (typeof OnboardingStep)[keyof typeof OnboardingStep];

export const STEP_ORDER: readonly OnboardingStep[] = Object.values(OnboardingStep);

export const StepStatus = { done: 'done', skipped: 'skipped' } as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

/** Steps that need an external account (Meta, Google): they may be skipped and never block. */
export const SKIPPABLE_STEPS: ReadonlySet<OnboardingStep> = new Set([
  OnboardingStep.whatsapp,
  OnboardingStep.google,
]);

export const onboardingProgressSchema = z.object({
  steps: z.partialRecord(z.enum(OnboardingStep), z.enum(StepStatus)).default({}),
  /** Open template key (spec 11): any key of the template registry. */
  specialty: z.string().optional(),
  /** S-05: when each step was last settled (ISO), for the funnel and the abandonment reminders. */
  at: z.partialRecord(z.enum(OnboardingStep), z.iso.datetime()).default({}),
});
export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;

export function parseProgress(raw: unknown): OnboardingProgress {
  return onboardingProgressSchema.parse(raw ?? {});
}

/** Where to resume: the first step not yet done or skipped; null when all are settled. */
export function currentStep(progress: OnboardingProgress): OnboardingStep | null {
  return STEP_ORDER.find((step) => progress.steps[step] === undefined) ?? null;
}

export interface StepMark {
  step: OnboardingStep;
  status: StepStatus;
  now: Date;
}

/** Records a step transition together with its time (S-05 funnel). */
export function markStep(progress: OnboardingProgress, { step, status, now }: StepMark): void {
  progress.steps[step] = status;
  progress.at[step] = now.toISOString();
}

/** Latest step transition, or null when the tenant never started. */
export function lastStepAt(progress: OnboardingProgress): Date | null {
  const times = Object.values(progress.at).map((iso) => Date.parse(iso));
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}
