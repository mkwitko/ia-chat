import { TenantStatus, type Db, type Prisma } from '@app/db';
import { AlertEvent, type Alert } from '@app/observability';

// The sweeps' outer loop: one transaction per tenant (RLS), skipping closed accounts. A tenant
// whose channel fails is reported and skipped; the others still run.

const SWEEP_FAILED = 'agenda_follow_up_sweep';

interface Scope {
  db: Db;
  alert: Alert;
  onlyTenantId?: string | undefined;
}

export async function forEachTenant(
  { db, alert, onlyTenantId }: Scope,
  where: Prisma.TenantWhereInput,
  work: (tenantId: string) => Promise<void>,
): Promise<void> {
  const tenants = await db.client.tenant.findMany({
    where: {
      ...where,
      status: { not: TenantStatus.cancelled },
      ...(onlyTenantId ? { id: onlyTenantId } : {}),
    },
    select: { id: true },
  });
  for (const { id } of tenants)
    await work(id).catch((error: unknown) => {
      alert(AlertEvent.jobFailed, { tenantId: id, code: SWEEP_FAILED }, error);
    });
}
