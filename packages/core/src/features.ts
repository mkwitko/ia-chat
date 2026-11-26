import { PlanId } from './plans.ts';

// Recursos (owner decision, 26/11/2026; spec 01 "Recursos", H-51): features the owner turns on
// and off. A feature outside the tenant's plan is never on. Inside it, it is on unless the owner
// turned it off. The panel, the API and the worker read this catalog; nothing else decides.

export const Feature = {
  audioTranscription: 'audio_transcription',
  pixDeposit: 'pix_deposit',
  ocrPixReceipt: 'ocr_pix_receipt',
  ocrIdCard: 'ocr_id_card',
  ocrMedicalRequest: 'ocr_medical_request',
} as const;
export type Feature = (typeof Feature)[keyof typeof Feature];

/** The lowest plan that includes each feature; the plans above include it too. */
export const FEATURE_PLAN = {
  [Feature.audioTranscription]: PlanId.essencial,
  [Feature.pixDeposit]: PlanId.pro,
  [Feature.ocrPixReceipt]: PlanId.pro,
  [Feature.ocrIdCard]: PlanId.pro,
  [Feature.ocrMedicalRequest]: PlanId.pro,
} as const satisfies Record<Feature, PlanId>;

export const FEATURES: readonly Feature[] = Object.values(Feature);

const PLAN_ORDER: readonly PlanId[] = [PlanId.essencial, PlanId.agenda, PlanId.pro, PlanId.clinica];

export function isFeature(value: string): value is Feature {
  return FEATURES.some((feature) => feature === value);
}

export function planIncludes(plan: PlanId, feature: Feature): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(FEATURE_PLAN[feature]);
}

export interface FeatureState {
  feature: Feature;
  /** The lowest plan that has it, shown when the tenant's plan does not. */
  plan: PlanId;
  included: boolean;
  enabled: boolean;
}

/** The owner's saved choices; a feature without one follows the plan. */
export type FeatureChoices = Partial<Record<Feature, boolean>>;

export function featureStates(plan: PlanId, choices: FeatureChoices): FeatureState[] {
  return FEATURES.map((feature) => {
    const included = planIncludes(plan, feature);
    return {
      feature,
      plan: FEATURE_PLAN[feature],
      included,
      enabled: included && (choices[feature] ?? true),
    };
  });
}
