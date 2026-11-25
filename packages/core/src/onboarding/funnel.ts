import { parseProgress, STEP_ORDER, type OnboardingStep } from './steps.ts';

// RF-86: the funnel, step by step. A tenant counts at a step when it settled it (done or skipped).

export interface FunnelStep {
  step: OnboardingStep;
  count: number;
}

export interface Funnel {
  signups: number;
  steps: FunnelStep[];
}

/** Aggregates only: each tenant's raw progress goes in, counts come out; no personal data. */
export function buildFunnel(rawProgress: readonly unknown[]): Funnel {
  const progress = rawProgress.map((raw) => parseProgress(raw));
  return {
    signups: progress.length,
    steps: STEP_ORDER.map((step) => ({
      step,
      count: progress.filter((p) => p.steps[step] !== undefined).length,
    })),
  };
}
