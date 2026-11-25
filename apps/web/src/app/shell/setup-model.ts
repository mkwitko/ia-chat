import type { OnboardingView, Step } from '../onboarding/onboarding-api';

export interface SetupProgress {
  done: number;
  total: number;
  currentTitle: string;
}

/** "X de N" counts done and skipped steps; null once nothing is pending (the links disappear). */
export function progressOf(
  view: Pick<OnboardingView, 'steps' | 'current'>,
  titleOf: (step: Step) => string,
): SetupProgress | null {
  if (!view.current) return null;
  return {
    done: view.steps.filter((step) => step.status !== null).length,
    total: view.steps.length,
    currentTitle: titleOf(view.current),
  };
}
