import { MESSAGE_TEXT_RETENTION_DAYS, readMediaInfo, type MediaStore } from '@app/core';
import { Prisma, type Db } from '@app/db';
import { AlertEvent, type Alert } from '@app/observability';
import { eachTenant } from './tenants.ts';

// H-34 (spec 06): message text and media references live at most MESSAGE_TEXT_RETENTION_DAYS after
// the conversation's last message. The job sets `text` and `media` to null, stamps `redacted_at`,
// deletes the R2 objects and drops the conversation summary. Author, type, time and status stay.

const MS_PER_DAY = 86_400_000;
const DEFAULT_BATCH = 200;
const RETENTION_FAILED = 'message_text_retention';

export interface RetentionDeps {
  db: Db;
  now: Date;
  /** Absent when R2 is not configured: nothing was ever stored, so there is nothing to delete. */
  store?: Pick<MediaStore, 'delete'> | undefined;
  /** Ids only, never content (RN-38). */
  alert: Alert;
  batchSize?: number;
  /** Tests: limits the run to these tenants (the dev database holds thousands). */
  onlyTenantIds?: readonly string[];
}

export interface RetentionResult {
  messages: number;
  media: number;
  summaries: number;
}

interface Tenant {
  deps: RetentionDeps;
  tenantId: string;
  cutoff: Date;
}

const hasContent: Prisma.MessageWhereInput = {
  OR: [{ text: { not: null } }, { NOT: { media: { equals: Prisma.DbNull } } }],
};

/**
 * Once a day: erases what is past the period, per tenant, in batches (each its own transaction, so
 * R2 calls never hold one open). Safe to run any number of times; a failure only skips that
 * tenant until tomorrow, and the rows are cleared only after their R2 objects are gone.
 */
export async function sweepMessageRetention(deps: RetentionDeps): Promise<RetentionResult> {
  const cutoff = new Date(deps.now.getTime() - MESSAGE_TEXT_RETENTION_DAYS * MS_PER_DAY);
  const results = await eachTenant(
    { db: deps.db, ...(deps.onlyTenantIds ? { onlyTenantIds: deps.onlyTenantIds } : {}) },
    (tenantId) => redactTenant({ deps, tenantId, cutoff }),
    (tenantId) => {
      deps.alert(AlertEvent.jobFailed, { tenantId, code: RETENTION_FAILED });
    },
  );
  return results.reduce(
    (sum, one) => ({
      messages: sum.messages + one.messages,
      media: sum.media + one.media,
      summaries: sum.summaries + one.summaries,
    }),
    { messages: 0, media: 0, summaries: 0 },
  );
}

async function redactTenant(tenant: Tenant): Promise<RetentionResult> {
  const { deps, tenantId, cutoff } = tenant;
  const batchSize = deps.batchSize ?? DEFAULT_BATCH;
  const total: RetentionResult = { messages: 0, media: 0, summaries: 0 };
  for (;;) {
    const batch = await redactBatch(tenant, batchSize);
    total.messages += batch.messages;
    total.media += batch.media;
    if (batch.messages < batchSize) break;
  }
  const { count } = await deps.db.withTenant(tenantId, (tx) =>
    tx.conversation.updateMany({
      where: { lastMessageAt: { lt: cutoff }, summary: { not: null } },
      data: { summary: null, summaryUntil: null },
    }),
  );
  return { ...total, summaries: count };
}

async function redactBatch(tenant: Tenant, batchSize: number) {
  const { deps, tenantId, cutoff } = tenant;
  const rows = await deps.db.withTenant(tenantId, (tx) =>
    tx.message.findMany({
      where: { redactedAt: null, conversation: { lastMessageAt: { lt: cutoff } }, ...hasContent },
      select: { id: true, media: true },
      orderBy: { id: 'asc' },
      take: batchSize,
    }),
  );
  if (rows.length === 0) return { messages: 0, media: 0 };
  const keys = rows.flatMap((row) => readMediaInfo(row.media)?.key ?? []);
  // The objects go first: if R2 refuses, the rows still point at them and tomorrow retries.
  for (const key of keys) await requireStore(deps).delete(key);
  await deps.db.withTenant(tenantId, (tx) =>
    tx.message.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { text: null, media: Prisma.DbNull, redactedAt: deps.now },
    }),
  );
  return { messages: rows.length, media: keys.length };
}

const NO_STORE = 'stored media found but R2 is not configured';

function requireStore({ store }: RetentionDeps): Pick<MediaStore, 'delete'> {
  if (!store) throw new Error(NO_STORE);
  return store;
}
