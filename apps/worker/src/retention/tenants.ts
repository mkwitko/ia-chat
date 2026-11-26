import { TenantStatus, type Db, type Tx } from '@app/db';

export interface TenantRun {
  db: Db;
  /** Tests: limits the run to these tenants (the dev database holds thousands). */
  onlyTenantIds?: readonly string[];
}

/** Tenants whose data still exists: closed accounts are erased whole by the deletion job (E-26). */
export async function liveTenantIds({ db, onlyTenantIds }: TenantRun): Promise<string[]> {
  const rows = await db.client.tenant.findMany({
    where: {
      dataDeletedAt: null,
      status: { not: TenantStatus.cancelled },
      ...(onlyTenantIds ? { id: { in: [...onlyTenantIds] } } : {}),
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

/** Runs `work` in `withTenant` for each live tenant, one at a time (a parallel burst would starve the pool). */
export async function forEachTenant<T>(
  run: TenantRun,
  work: (tx: Tx, tenantId: string) => Promise<T>,
  onError: (tenantId: string) => void,
): Promise<T[]> {
  const results: T[] = [];
  for (const tenantId of await liveTenantIds(run)) {
    try {
      results.push(await run.db.withTenant(tenantId, (tx) => work(tx, tenantId)));
    } catch {
      // No cause on purpose: a database error can quote the row it failed on (RN-38).
      onError(tenantId);
    }
  }
  return results;
}
