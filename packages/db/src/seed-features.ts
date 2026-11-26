import { FeatureKey, type Tx } from './index.ts';

/** Fixture rows of the Recursos tables (H-51): one owner choice. */
export async function seedFeatures(tx: Tx, tenantId: string): Promise<void> {
  await tx.featureSetting.create({
    data: { tenantId, feature: FeatureKey.audio_transcription, enabled: true },
  });
}

/** Fixture of the deposit settings (H-52): a fictitious random key. */
export async function seedDeposit(tx: Tx, tenantId: string): Promise<void> {
  await tx.depositSettings.create({
    data: {
      tenantId,
      pixKey: '123e4567-e12b-12d1-a456-426655440000',
      receiverName: 'Consultorio Ficticio',
      city: 'Sao Paulo',
    },
  });
}
