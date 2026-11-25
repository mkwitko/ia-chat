import { describe, expect, it } from 'vitest';
import { Provider, translateProviderError, GENERIC_ERRORS } from './provider-errors.ts';
import { currentStep, parseProgress, Specialty, StepStatus, STEP_ORDER } from './steps.ts';
import { resolveTemplate } from './templates.ts';

describe('progress', () => {
  it('resumes at the first unsettled step', () => {
    expect(currentStep(parseProgress({}))).toBe('account');
    const progress = parseProgress({ steps: { account: StepStatus.done, services: 'skipped' } });
    expect(currentStep(progress)).toBe('location');
  });

  it('is null once every step is settled', () => {
    const steps = Object.fromEntries(STEP_ORDER.map((step) => [step, StepStatus.done]));
    expect(currentStep(parseProgress({ steps }))).toBeNull();
  });
});

describe('templates', () => {
  it.each(Object.values(Specialty))('%s: no price when forbidden', (specialty) => {
    const template = resolveTemplate({ specialty, pricesForbidden: true });
    expect(template.services.every((service) => service.priceCents === 0)).toBe(true);
    expect(template.answers.some((item) => item.mentionsPrice)).toBe(false);
  });

  it('keeps example prices when allowed and marks everything as an example', () => {
    const template = resolveTemplate({ specialty: Specialty.quiropraxia, pricesForbidden: false });
    expect(template.services.every((service) => service.priceCents > 0)).toBe(true);
    expect(template.services.every((service) => service.name.endsWith('(exemplo)'))).toBe(true);
  });
});

describe('provider errors', () => {
  it('translates known codes and falls back to a generic message', () => {
    expect(translateProviderError({ provider: Provider.meta, code: 190 }).action).toMatch(
      /Conecte/,
    );
    expect(
      translateProviderError({ provider: Provider.google, code: 'invalid_grant' }).message,
    ).toBeTruthy();
    expect(translateProviderError({ provider: Provider.meta, code: 999999 })).toBe(
      GENERIC_ERRORS.meta,
    );
  });
});
