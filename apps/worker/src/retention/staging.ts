import { IMPORT_STAGING_DAYS } from '@app/core';
import type { Db } from '@app/db';
import { AlertEvent, type Alert } from '@app/observability';
import { forEachTenant } from './tenants.ts';

const PURGE_FAILED = 'import_staging_purge';
const MS_PER_DAY = 86_400_000;

export interface StagingPurgeDeps {
  db: Db;
  now: Date;
  alert: Alert;
  onlyTenantIds?: readonly string[];
}

export interface StagingPurgeResult {
  contacts: number;
}

/**
 * E-24b (H-49): once a day, deletes staged history (contacts and their message texts) the owner did
 * not decide on within IMPORT_STAGING_DAYS. Counts only in the result; safe to run any number of times.
 */
export async function purgeStagedImports(deps: StagingPurgeDeps): Promise<StagingPurgeResult> {
  const cutoff = new Date(deps.now.getTime() - IMPORT_STAGING_DAYS * MS_PER_DAY);
  const counts = await forEachTenant(
    { db: deps.db, ...(deps.onlyTenantIds ? { onlyTenantIds: deps.onlyTenantIds } : {}) },
    async (tx) => {
      const { count } = await tx.importContact.deleteMany({ where: { createdAt: { lt: cutoff } } }); // messages cascade
      return count;
    },
    (tenantId) => {
      deps.alert(AlertEvent.jobFailed, { tenantId, code: PURGE_FAILED });
    },
  );
  return { contacts: counts.reduce((sum, count) => sum + count, 0) };
}
