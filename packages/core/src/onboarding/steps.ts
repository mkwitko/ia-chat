import * as z from 'zod';

// Spec 09, "Cadastro e ativação sem ajuda": the eight steps, in order.

export const OnboardingStep = {
  account: 'account',
  services: 'services',
  location: 'location',
  tone: 'tone',
  simulator: 'simulator',
  whatsapp: 'whatsapp',
  google: 'google',
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

export const Specialty = {
  quiropraxia: 'quiropraxia',
  fisioterapia: 'fisioterapia',
  psicologia: 'psicologia',
  nutricao: 'nutricao',
} as const;
export type Specialty = (typeof Specialty)[keyof typeof Specialty];

export const onboardingProgressSchema = z.object({
  steps: z.partialRecord(z.enum(OnboardingStep), z.enum(StepStatus)).default({}),
  specialty: z.enum(Specialty).optional(),
});
export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;

export function parseProgress(raw: unknown): OnboardingProgress {
  return onboardingProgressSchema.parse(raw ?? {});
}

/** Where to resume: the first step not yet done or skipped; null when all are settled. */
export function currentStep(progress: OnboardingProgress): OnboardingStep | null {
  return STEP_ORDER.find((step) => progress.steps[step] === undefined) ?? null;
}
