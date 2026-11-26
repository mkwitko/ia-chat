import type { EmailSender } from '@app/core';
import { WEEKLY_REPORT_QUEUE, workTenantQueue, type Db } from '@app/db';
import type { PgBoss } from 'pg-boss';
import { tenantOf } from '../conversation/reminder-job.ts';
import type { Deliver } from '../notify/push.ts';
import { ownerEmail } from '../trial/owner-email.ts';
import { readWeeklyReport } from './weekly-report.ts';
import { weeklyEmail, weeklyNotice } from './weekly-text.ts';

/** Monday 08:00, in each tenant's own zone (the schedule carries `tz`). */
export const WEEKLY_CRON = '0 8 * * 1';
const REASON = 'weekly_report';

/** One schedule per tenant, keyed by the tenant; upserts, so a changed timezone is picked up. */
export function scheduleWeeklyReport(
  boss: PgBoss,
  tenant: { id: string; timezone: string },
): Promise<void> {
  return boss.schedule(
    WEEKLY_REPORT_QUEUE.name,
    WEEKLY_CRON,
    { tenantId: tenant.id, data: {} },
    { tz: tenant.timezone, key: tenant.id },
  );
}

export interface WeeklyWiring {
  boss: PgBoss;
  db: Db;
  email: EmailSender;
  deliver: Deliver;
  panelUrl: string;
}

/** E-mail to the owner and push to the subscribed browsers, after the read commits. */
export async function startWeeklyReport({ boss, db, email, deliver, panelUrl }: WeeklyWiring) {
  await workTenantQueue({
    boss,
    db,
    queue: WEEKLY_REPORT_QUEUE.name,
    handler: async (tx, _data, job) => {
      const tenantId = tenantOf(job);
      const report = await readWeeklyReport(tx, { tenantId, now: new Date() });
      if (!report) return undefined;
      return async () => {
        const to = await ownerEmail(db, tenantId);
        if (to) await email.send(weeklyEmail({ to, report, panelUrl }));
        await deliver(tenantId, weeklyNotice(report), { reason: REASON });
      };
    },
  });
}
