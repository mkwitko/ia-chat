import { describe, expect, it } from 'vitest';
import type { OnboardingView } from '../onboarding/onboarding-api';
import { progressOf } from './setup-model';

const steps = [
  { step: 'account', status: 'done' },
  { step: 'whatsapp', status: 'skipped' },
  { step: 'services', status: null },
  { step: 'activation', status: null },
] satisfies OnboardingView['steps'];
const titleOf = (step: string) => `title of ${step}`;

describe('progressOf', () => {
  it('counts done and skipped steps and names the current one', () => {
    expect(progressOf({ steps, current: 'services' }, titleOf)).toEqual({
      done: 2,
      total: 4,
      currentTitle: 'title of services',
    });
  });

  it('is null once every step is settled, so the return links disappear', () => {
    expect(progressOf({ steps, current: null }, titleOf)).toBeNull();
  });
});
