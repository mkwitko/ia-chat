import { SUMMARY_QUEUE, SUMMARY_SYNC_QUEUE, workTenantQueue } from '@app/db';
import type { PgBoss } from 'pg-boss';
import { tenantOf } from '../conversation/reminder-job.ts';
import { startSummaryNotifier, type NotifierSetup } from '../notify/index.ts';
import { sendNightlySummary } from './nightly-summary.ts';
import { syncSummarySchedules } from './summary-schedule.ts';

const SUMMARY_SYNC_CRON = '*/15 * * * *';

/**
 * RF-15: the professional's agenda for tomorrow, at the time each tenant chose (default 20:00).
 * The sync every 15 minutes also keeps the Monday report's schedules current.
 */
export async function startNightlySummary({ boss, setup }: { boss: PgBoss; setup: NotifierSetup }) {
  const { db } = setup;
  const summaryNotifier = startSummaryNotifier(setup);
  await workTenantQueue({
    boss,
    db,
    queue: SUMMARY_QUEUE.name,
    handler: (tx, _data, job) =>
      sendNightlySummary(tx, { tenantId: tenantOf(job), now: new Date() }, (summary) =>
        summaryNotifier({ tenantId: tenantOf(job), ...summary }),
      ),
  });
  await syncSummarySchedules(db, boss);
  await boss.schedule(SUMMARY_SYNC_QUEUE.name, SUMMARY_SYNC_CRON);
  await boss.work(SUMMARY_SYNC_QUEUE.name, async () => {
    await syncSummarySchedules(db, boss);
  });
}
