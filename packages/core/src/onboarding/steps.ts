import * as z from 'zod';

// Spec 09, "Cadastro e ativação sem ajuda": the steps, in order. Owner decision (25/11/2026, H-37):
// WhatsApp right after CPF/CNPJ. Content per docs/research/09 (H-39): "Onde te encontram" with
// the prefill review, WhatsApp, services and packages, hours (with Google Agenda), simulator,
// activation. Tone, reminders and the rest moved to the checklist on Início.

export const OnboardingStep = {
  account: 'account',
  whatsapp: 'whatsapp',
  services: 'services',
  hours: 'hours',
  simulator: 'simulator',
  activation: 'activation',
} as const;
export type OnboardingStep = (typeof OnboardingStep)[keyof typeof OnboardingStep];

export const STEP_ORDER: readonly OnboardingStep[] = Object.values(OnboardingStep);

export const StepStatus = { done: 'done', skipped: 'skipped' } as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

/** The step that needs an external account (Meta): it may be skipped and never blocks. */
export const SKIPPABLE_STEPS: ReadonlySet<OnboardingStep> = new Set([OnboardingStep.whatsapp]);

const KNOWN_STEPS = new Set<string>(Object.values(OnboardingStep));

/** Progress saved by the earlier flow may name steps that no longer exist: they are dropped. */
function knownStepsOnly(raw: unknown): unknown {
  if (!(raw instanceof Object)) return raw;
  return Object.fromEntries(Object.entries(raw).filter(([step]) => KNOWN_STEPS.has(step)));
}

export const onboardingProgressSchema = z.object({
  steps: z.preprocess(
    knownStepsOnly,
    z.partialRecord(z.enum(OnboardingStep), z.enum(StepStatus)).default({}),
  ),
  /** Open template key (spec 11): any key of the template registry. */
  specialty: z.string().optional(),
  /** S-05: when each step was last settled (ISO), for the funnel and the abandonment reminders. */
  at: z.preprocess(
    knownStepsOnly,
    z.partialRecord(z.enum(OnboardingStep), z.iso.datetime()).default({}),
  ),
});
export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;

export function parseProgress(raw: unknown): OnboardingProgress {
  return onboardingProgressSchema.parse(raw ?? {});
}

/**
 * Where to resume: the first step not yet done or skipped; null when all are settled. An
 * activated account is finished even if a step was added to the flow after it activated.
 */
export function currentStep(progress: OnboardingProgress): OnboardingStep | null {
  if (progress.steps.activation === StepStatus.done) return null;
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
