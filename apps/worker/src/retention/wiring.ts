import { createMediaStore, r2Config, r2EnvSchema } from '@app/core';
import {
  IMPORT_STAGING_PURGE_QUEUE,
  MESSAGE_RETENTION_QUEUE,
  TENANT_DELETION_QUEUE,
  type Db,
} from '@app/db';
import type { Alert } from '@app/observability';
import type { PgBoss } from 'pg-boss';
import { sweepMessageRetention } from './messages.ts';
import { purgeStagedImports } from './staging.ts';
import { sweepTenantDeletion } from './sweep.ts';

// 03:30 in the clinics' time zone: after the nightly jobs, before anyone opens the panel.
const DELETION_CRON = '30 3 * * *';
const DELETION_TZ = 'America/Sao_Paulo';
const DELETION_DONE = 'tenant deletion done';
// 03:40: right after the account erasure.
const STAGING_CRON = '40 3 * * *';
const STAGING_DONE = 'import staging purge done';
// 03:50: after the other erasures; the panel is quiet.
const RETENTION_CRON = '50 3 * * *';
const RETENTION_DONE = 'message text retention done';

export interface DeletionWiring {
  boss: PgBoss;
  db: Db;
  alert: Alert;
  /** Environment with the R2 variables: the media objects go with the message text (H-34). */
  source: Record<string, string | undefined>;
  log: (fields: object, message: string) => void;
}

/** E-26 (RF-63), E-24b and H-34: the daily erasures (closed accounts, staged history, old message text). */
export async function startTenantDeletion(wiring: DeletionWiring): Promise<void> {
  const { boss, db, alert, log } = wiring;
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
  const r2 = r2Config(r2EnvSchema.parse(wiring.source));
  const store = r2 ? createMediaStore(r2) : undefined;
  await boss.schedule(MESSAGE_RETENTION_QUEUE.name, RETENTION_CRON, null, { tz: DELETION_TZ });
  await boss.work(MESSAGE_RETENTION_QUEUE.name, async () => {
    const result = await sweepMessageRetention({ db, now: new Date(), store, alert });
    log(result, RETENTION_DONE);
  });
}
