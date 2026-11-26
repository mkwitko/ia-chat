import {
  PlanId,
  featureStates,
  type Feature,
  type FeatureChoices,
  type FeatureState,
} from '@app/core';
import type { Db, Tx } from './index.ts';

// Recursos (H-51): the effective on/off of each feature for a tenant, read inside withTenant.
// Where a feature runs (agent tool, worker job), it asks featureEnabled first.

export async function readFeatures(tx: Tx, tenantId: string): Promise<FeatureState[]> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { plan: true },
  });
  const rows = await tx.featureSetting.findMany({ where: { tenantId } });
  const choices: FeatureChoices = Object.fromEntries(
    rows.map((row) => [row.feature, row.enabled] as const),
  );
  return featureStates(PlanId[tenant.plan], choices);
}

export async function featureEnabledIn(tx: Tx, tenantId: string, feature: Feature) {
  const states = await readFeatures(tx, tenantId);
  return states.some((state) => state.feature === feature && state.enabled);
}

export function featureEnabled(db: Db, tenantId: string, feature: Feature): Promise<boolean> {
  return db.withTenant(tenantId, (tx) => featureEnabledIn(tx, tenantId, feature));
}
