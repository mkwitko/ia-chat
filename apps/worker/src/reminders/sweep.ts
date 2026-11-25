import { ScheduledMessageState, TenantStatus, type Db } from '@app/db';
import { AlertEvent, type Alert } from '@app/observability';
import { deliverScheduled, DeliveryOutcome, type ReminderChannel } from './deliver.ts';

const SEND_FAILED = 'scheduled_message_send';
const BATCH_PER_TENANT = 50;

export interface SweepDeps {
  db: Db;
  channel: ReminderChannel;
  alert: Alert;
  now: Date;
  /** Tests and one-off runs: only this tenant. */
  onlyTenantId?: string;
}

export type SweepResult = Record<DeliveryOutcome | 'failed', number>;

const emptyResult = (): SweepResult => ({
  [DeliveryOutcome.sent]: 0,
  [DeliveryOutcome.refused]: 0,
  [DeliveryOutcome.windowClosed]: 0,
  [DeliveryOutcome.noConversation]: 0,
  [DeliveryOutcome.skipped]: 0,
  failed: 0,
});

/**
 * RF-46 and RF-47: sends what is due, tenant by tenant (RLS: one tenant per transaction).
 * Runs every minute, so "immediately" means within a minute. Safe to run concurrently: a
 * message another sweep holds is skipped.
 * ponytail: one query per active tenant per minute; a due-tenants index when there are thousands.
 */
export async function sweepScheduledMessages(deps: SweepDeps): Promise<SweepResult> {
  const result = emptyResult();
  const tenants = await deps.db.client.tenant.findMany({
    where: {
      status: { not: TenantStatus.cancelled },
      ...(deps.onlyTenantId ? { id: deps.onlyTenantId } : {}),
    },
    select: { id: true },
  });
  for (const { id } of tenants) {
    const due = await deps.db.withTenant(id, (tx) =>
      tx.scheduledMessage.findMany({
        where: { state: ScheduledMessageState.scheduled, sendAt: { lte: deps.now } },
        orderBy: { sendAt: 'asc' },
        take: BATCH_PER_TENANT,
        select: { id: true },
      }),
    );
    for (const { id: messageId } of due) await sendOne(deps, { tenantId: id, messageId, result });
  }
  return result;
}

async function sendOne(
  deps: SweepDeps,
  { tenantId, messageId, result }: { tenantId: string; messageId: string; result: SweepResult },
): Promise<void> {
  try {
    const outcome = await deps.db.withTenant(tenantId, (tx) =>
      deliverScheduled(tx, { messageId, now: deps.now, channel: deps.channel }),
    );
    result[outcome] += 1;
  } catch (error) {
    // Out of the queue: a message the channel keeps refusing must not be retried every minute.
    await deps.db.withTenant(tenantId, (tx) =>
      tx.scheduledMessage.updateMany({
        where: { id: messageId, state: ScheduledMessageState.scheduled },
        data: { state: ScheduledMessageState.failed },
      }),
    );
    result.failed += 1;
    deps.alert(AlertEvent.jobFailed, { tenantId, code: SEND_FAILED }, error);
  }
}
