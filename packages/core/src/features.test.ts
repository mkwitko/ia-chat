import { describe, expect, it } from 'vitest';
import { Feature, featureStates, isFeature, planIncludes } from './features.ts';
import { PlanId } from './plans.ts';

const stateOf = (plan: PlanId, feature: Feature, choices = {}) =>
  featureStates(plan, choices).find((state) => state.feature === feature);

describe('features (H-51)', () => {
  it('a plan includes its own features and those of the plans below', () => {
    expect(planIncludes(PlanId.essencial, Feature.audioTranscription)).toBe(true);
    expect(planIncludes(PlanId.agenda, Feature.pixDeposit)).toBe(false);
    expect(planIncludes(PlanId.pro, Feature.pixDeposit)).toBe(true);
    expect(planIncludes(PlanId.clinica, Feature.ocrMedicalRequest)).toBe(true);
  });

  it('is on by default when the plan includes it', () => {
    expect(stateOf(PlanId.pro, Feature.ocrIdCard)).toMatchObject({ included: true, enabled: true });
  });

  it('follows the owner when included', () => {
    const off = { [Feature.ocrIdCard]: false };
    expect(stateOf(PlanId.pro, Feature.ocrIdCard, off)?.enabled).toBe(false);
  });

  it('is never on outside the plan, whatever was saved, and says which plan has it', () => {
    const on = { [Feature.pixDeposit]: true };
    expect(stateOf(PlanId.agenda, Feature.pixDeposit, on)).toEqual({
      feature: Feature.pixDeposit,
      plan: PlanId.pro,
      included: false,
      enabled: false,
    });
  });

  it('lists every feature once and recognizes its keys', () => {
    const keys = featureStates(PlanId.essencial, {}).map((state) => state.feature);
    expect(new Set(keys).size).toBe(Object.values(Feature).length);
    expect(isFeature('pix_deposit')).toBe(true);
    expect(isFeature('teleport')).toBe(false);
  });
});
