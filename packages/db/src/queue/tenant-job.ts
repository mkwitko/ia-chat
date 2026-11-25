import { withLogContext } from '@app/observability';
import type { Job, PgBoss, SendOptions, WorkOptions } from 'pg-boss';
import * as z from 'zod';
import type { Db, Tx } from '../index.ts';
import { deadLetterName } from './definitions.ts';

/**
 * RN-03: every job carries tenantId; the worker enters withTenant before any read.
 * Payloads carry ids, never message content (RN-38).
 */
const envelopeSchema = z.object({ tenantId: z.uuid(), data: z.record(z.string(), z.unknown()) });

export type TenantJob = z.infer<typeof envelopeSchema>;

export interface TenantJobRequest {
  boss: PgBoss;
  queue: string;
  job: TenantJob;
  options?: SendOptions;
}

export async function sendTenantJob({
  boss,
  queue,
  job,
  options = {},
}: TenantJobRequest): Promise<string | null> {
  return boss.send(queue, envelopeSchema.parse(job), options);
}

export interface TenantWorker {
  boss: PgBoss;
  db: Db;
  queue: string;
  options?: WorkOptions;
  /** May return work to run after the transaction commits (e.g. queueing follow-up jobs). */
  handler: (tx: Tx, data: TenantJob['data'], job: Job<unknown>) => Promise<AfterCommit | undefined>;
}

export type AfterCommit = () => Promise<void>;

/** Each job runs inside withTenant for its own tenant. A throw makes pg-boss retry it. */
export async function workTenantQueue({ boss, db, queue, options = {}, handler }: TenantWorker) {
  return boss.work(queue, options, async (jobs) => {
    for (const job of jobs) {
      const { tenantId, data } = envelopeSchema.parse(job.data);
      await withLogContext({ jobId: job.id, queue, tenantId }, async () => {
        const afterCommit = await db.withTenant(tenantId, (tx) => handler(tx, data, job));
        await afterCommit?.();
      });
    }
  });
}

export interface DeadLetter {
  queue: string;
  jobId: string;
  tenantId: string | undefined;
}

export interface DeadLetterWatch {
  boss: PgBoss;
  queue: string;
  options?: WorkOptions;
  onDead: (dead: DeadLetter) => void;
}

/** Alerts on jobs that exhausted their retries. */
export async function watchDeadLetters({ boss, queue, options = {}, onDead }: DeadLetterWatch) {
  const deadQueue = deadLetterName(queue);
  return boss.work(deadQueue, options, (jobs) => {
    for (const job of jobs) {
      const tenantId = envelopeSchema.shape.tenantId.safeParse(
        (job.data as { tenantId?: unknown }).tenantId,
      ).data;
      onDead({ queue: deadQueue, jobId: job.id, tenantId });
    }
    return Promise.resolve();
  });
}
