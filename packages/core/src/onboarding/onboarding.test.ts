import { describe, expect, it } from 'vitest';
import { Provider, translateProviderError, GENERIC_ERRORS } from './provider-errors.ts';
import { currentStep, parseProgress, StepStatus, STEP_ORDER } from './steps.ts';
import { parsePolicy, Sensitivity } from '../policy.ts';
import { isTemplateKey, resolveTemplate, SPECIALTY_OPTIONS } from './templates.ts';
import { TemplateId } from './templates-data.ts';

describe('progress', () => {
  it('resumes at the first unsettled step', () => {
    expect(currentStep(parseProgress({}))).toBe('account');
    const progress = parseProgress({ steps: { account: StepStatus.done } });
    expect(currentStep(progress)).toBe('whatsapp');
  });

  it('drops steps of the earlier flow instead of failing (google, location, tone)', () => {
    const progress = parseProgress({
      steps: { account: 'done', google: 'skipped', tone: 'done' },
      at: { google: '2026-11-25T10:00:00.000Z' },
    });
    expect(progress.steps).toEqual({ account: 'done' });
    expect(progress.at).toEqual({});
  });

  it('treats an activated account as finished, even after the flow gained a step', () => {
    const progress = parseProgress({ steps: { account: 'done', activation: 'done' } });
    expect(currentStep(progress)).toBeNull();
  });

  it('follows the guided order (H-37, H-39): find, WhatsApp, services, hours, test, activation', () => {
    expect(STEP_ORDER).toEqual([
      'account',
      'whatsapp',
      'services',
      'hours',
      'simulator',
      'activation',
    ]);
  });

  it('is null once every step is settled', () => {
    const steps = Object.fromEntries(STEP_ORDER.map((step) => [step, StepStatus.done]));
    expect(currentStep(parseProgress({ steps }))).toBeNull();
  });
});

describe('open template key (M-02)', () => {
  it('accepts registry keys only, and a missing policy stays health', () => {
    expect(isTemplateKey(TemplateId.salaoDeBeleza)).toBe(true);
    expect(isTemplateKey('inexistente')).toBe(false);
    expect(parsePolicy(undefined).sensitivity).toBe(Sensitivity.health);
    expect(parsePolicy({ sensitivity: Sensitivity.none }).sensitivity).toBe(Sensitivity.none);
  });
});

describe('templates', () => {
  it.each(SPECIALTY_OPTIONS.map((option) => option.specialty))(
    '%s: no price when forbidden',
    (specialty) => {
      const template = resolveTemplate({ specialty, pricesForbidden: true });
      expect(template.services.every((service) => service.priceCents === 0)).toBe(true);
      expect(template.answers.some((item) => item.mentionsPrice)).toBe(false);
    },
  );

  it('keeps example prices when allowed and marks everything as an example', () => {
    const template = resolveTemplate({
      specialty: TemplateId.salaoDeBeleza,
      pricesForbidden: false,
    });
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
