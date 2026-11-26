import { SUMMARY_QUEUE, TenantStatus, type Db } from '@app/db';
import type { PgBoss } from 'pg-boss';
import { scheduleWeeklyReport } from '../report/wiring.ts';

const MINUTES_PER_HOUR = 60;

/** `m` minutes after local midnight as a daily cron expression. */
export function summaryCron(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / MINUTES_PER_HOUR);
  return `${String(minuteOfDay % MINUTES_PER_HOUR)} ${String(hour)} * * *`;
}

/**
 * RF-15: one pg-boss schedule per tenant, keyed by the tenant, in the tenant's own zone and
 * at its configured time; the Monday report rides the same sweep. Upserts, so running it again
 * picks up a changed time.
 */
export async function syncSummarySchedules(db: Db, boss: PgBoss): Promise<number> {
  const tenants = await db.client.tenant.findMany({
    where: { status: { not: TenantStatus.cancelled } },
    select: { id: true, timezone: true, nightlySummaryMinute: true },
  });
  for (const tenant of tenants) {
    await scheduleWeeklyReport(boss, tenant);
    await boss.schedule(
      SUMMARY_QUEUE.name,
      summaryCron(tenant.nightlySummaryMinute),
      { tenantId: tenant.id, data: {} },
      { tz: tenant.timezone, key: tenant.id },
    );
  }
  return tenants.length;
}
