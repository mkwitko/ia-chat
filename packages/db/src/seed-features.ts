import { FeatureKey, type Tx } from './index.ts';

/** Fixture rows of the Recursos tables (H-51): one owner choice. */
export async function seedFeatures(tx: Tx, tenantId: string): Promise<void> {
  await tx.featureSetting.create({
    data: { tenantId, feature: FeatureKey.audio_transcription, enabled: true },
  });
}
