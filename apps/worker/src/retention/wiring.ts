import { IMPORT_STAGING_PURGE_QUEUE, TENANT_DELETION_QUEUE, type Db } from '@app/db';
import type { Alert } from '@app/observability';
import type { PgBoss } from 'pg-boss';
import { purgeStagedImports } from './staging.ts';
import { sweepTenantDeletion } from './sweep.ts';

// 03:30 in the clinics' time zone: after the nightly jobs, before anyone opens the panel.
const DELETION_CRON = '30 3 * * *';
const DELETION_TZ = 'America/Sao_Paulo';
const DELETION_DONE = 'tenant deletion done';
// 03:40: right after the account erasure.
const STAGING_CRON = '40 3 * * *';
const STAGING_DONE = 'import staging purge done';

export interface DeletionWiring {
  boss: PgBoss;
  db: Db;
  alert: Alert;
  log: (fields: object, message: string) => void;
}

/** E-26 (RF-63) and E-24b: schedules the daily erasure of closed accounts and of undecided staged history. */
export async function startTenantDeletion({ boss, db, alert, log }: DeletionWiring): Promise<void> {
  await boss.schedule(TENANT_DELETION_QUEUE.name, DELETION_CRON, null, { tz: DELETION_TZ });
  await boss.work(TENANT_DELETION_QUEUE.name, async () => {
    const result = await sweepTenantDeletion({ db, now: new Date(), alert });
    log(result, DELETION_DONE);
  });
  await boss.schedule(IMPORT_STAGING_PURGE_QUEUE.name, STAGING_CRON, null, { tz: DELETION_TZ });
  await boss.work(IMPORT_STAGING_PURGE_QUEUE.name, async () => {
    const result = await purgeStagedImports({ db, now: new Date(), alert });
    log(result, STAGING_DONE);
  });
}
