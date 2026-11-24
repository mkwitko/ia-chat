import { randomUUID } from 'node:crypto';
import { PgBoss } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../index.ts';
import { deadLetterName, type QueueDefinition } from './definitions.ts';
import { installQueues } from './install.ts';
import { sendTenantJob, watchDeadLetters, workTenantQueue } from './tenant-job.ts';

// E-05 "pronto quando": a delayed job with a unique key runs once under two concurrent workers.

const runtimeUrl = process.env.DATABASE_URL ?? '';
const migratorUrl = process.env.MIGRATION_DATABASE_URL ?? '';
if (!runtimeUrl || !migratorUrl)
  throw new Error('DATABASE_URL and MIGRATION_DATABASE_URL required');

const POLL_SECONDS = 0.5;
const WAIT_TIMEOUT_MS = 15_000;

const onceQueue: QueueDefinition = { name: `test-once-${randomUUID()}`, policy: 'short' };
const failingQueue: QueueDefinition = {
  name: `test-failing-${randomUUID()}`,
  options: { retryLimit: 1, retryDelay: 0, retryBackoff: false },
};

const db = createDb(runtimeUrl);
const bossErrors: unknown[] = [];
const workerA = runtimeBoss();
const workerB = runtimeBoss();
const workers = [workerA, workerB];

/** Like the worker app: app role, no schema migration, maintenance on. */
function runtimeBoss(): PgBoss {
  const boss = new PgBoss({ connectionString: runtimeUrl, migrate: false });
  boss.on('error', (error) => bossErrors.push(error));
  return boss;
}

async function waitFor(check: () => boolean): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('timed out waiting');
    await new Promise((resolve) => setTimeout(resolve, POLL_SECONDS * 1000));
  }
}

beforeAll(async () => {
  await installQueues(migratorUrl, [onceQueue, failingQueue]);
  await Promise.all(workers.map((w) => w.start()));
});

afterAll(async () => {
  await Promise.all(workers.map((w) => w.stop({ graceful: false })));
  await db.client.$disconnect();
});

describe('tenant jobs', () => {
  it('a delayed job with a unique key runs once, inside withTenant, under two workers', async () => {
    const tenantId = randomUUID();
    const seen: string[] = [];
    for (const worker of workers) {
      await workTenantQueue({
        boss: worker,
        db,
        queue: onceQueue.name,
        options: { pollingIntervalSeconds: POLL_SECONDS },
        handler: async (tx) => {
          const rows = await tx.$queryRaw<
            { id: string }[]
          >`select app_current_tenant()::text as id`;
          seen.push(rows[0]?.id ?? '');
        },
      });
    }
    const key = `conversation-${randomUUID()}`;
    const job = { tenantId, data: { conversationId: key } };
    const options = { startAfter: 1, singletonKey: key };
    const first = await sendTenantJob({
      boss: workerA,
      queue: onceQueue.name,
      job: job,
      options: options,
    });
    const second = await sendTenantJob({
      boss: workerB,
      queue: onceQueue.name,
      job: job,
      options: options,
    });

    expect(first).toEqual(expect.any(String));
    expect(second).toBeNull();
    await waitFor(() => seen.length > 0);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(seen).toEqual([tenantId]);
  });

  it('a job that keeps failing ends in the dead-letter queue and raises an alert', async () => {
    const tenantId = randomUUID();
    const worker = workerA;
    const alerts: unknown[] = [];
    await workTenantQueue({
      boss: worker,
      db,
      queue: failingQueue.name,
      options: { pollingIntervalSeconds: POLL_SECONDS },
      handler: () => Promise.reject(new Error('boom')),
    });
    await watchDeadLetters({
      boss: worker,
      queue: failingQueue.name,
      options: { pollingIntervalSeconds: POLL_SECONDS },
      onDead: (job) => alerts.push(job),
    });
    await sendTenantJob({ boss: worker, queue: failingQueue.name, job: { tenantId, data: {} } });
    await waitFor(() => alerts.length > 0);
    expect(alerts[0]).toMatchObject({ queue: deadLetterName(failingQueue.name), tenantId });
  });

  it('refuses to send a job without a valid tenant id', async () => {
    await expect(
      sendTenantJob({ boss: workerA, queue: onceQueue.name, job: { tenantId: 'nope', data: {} } }),
    ).rejects.toThrow(/tenantId/);
  });

  it('the app role runs maintenance without errors and cannot touch the business schema', async () => {
    expect(bossErrors).toEqual([]);
    await expect(
      db.client.$executeRawUnsafe('create table public.queue_probe (id int)'),
    ).rejects.toThrow(/permission denied/);
  });
});
