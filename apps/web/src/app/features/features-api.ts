import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/features/feature-routes.ts (contract in spec 10, "Recursos").

export const FEATURES_PATH = '/api/features';
const PUT = 'PUT';

export const FeatureKey = {
  audioTranscription: 'audio_transcription',
  pixDeposit: 'pix_deposit',
  ocrPixReceipt: 'ocr_pix_receipt',
  ocrIdCard: 'ocr_id_card',
  ocrMedicalRequest: 'ocr_medical_request',
} as const;
export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];

export interface FeatureState {
  feature: FeatureKey;
  /** The lowest plan that has it. */
  plan: string;
  included: boolean;
  enabled: boolean;
}

export interface FeaturesView {
  plan: string;
  features: FeatureState[];
}

export const useFeatures = () =>
  useQuery({ queryKey: [FEATURES_PATH], queryFn: () => api<FeaturesView>(FEATURES_PATH) });

export function useSaveFeature() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ feature, enabled }: { feature: FeatureKey; enabled: boolean }) =>
      api<FeaturesView>(FEATURES_PATH, { method: PUT, body: { features: { [feature]: enabled } } }),
    onSuccess: (data) => client.setQueryData([FEATURES_PATH], data),
  });
}
