import { parseStoredEvents } from '@app/channels';
import type { AfterCommit, Tx } from '@app/db';
import { AlertEvent, type Alert } from '@app/observability';
import * as z from 'zod';
import type { TurnRequest } from '../conversation/schedule.ts';
import type { UsageNotice } from '../usage/counters.ts';
import { applyInboundEvents } from './apply.ts';

const jobData = z.object({ inboundEventId: z.uuid() });

export interface InboundJobDeps {
  /** RF-25: a delivery failure the operator must act on (log, Sentry and the operator panel). */
  alert: Alert;
  /** Queues the turn (E-11). Runs after commit, so the turn sees the new turn_version. */
  scheduleTurn: (tenantId: string, request: TurnRequest) => Promise<void>;
  /** Pushes the 80% and 100% franchise warnings (E-18). */
  /** Queues the media download (E-10). Runs after commit; the job reads the stored message. */
  scheduleMedia?: (tenantId: string, messageId: string) => Promise<void>;
  notifyUsage?: (tenantId: string, notice: UsageNotice) => void;
  /** RF-29: a connected channel went down (operator alert and the owner's push). */
  channelDown?: (tenantId: string) => void;
}

/** inbound.process: turns one stored webhook batch into messages and statuses (RF-21). */
export async function processInboundEvent(
  tx: Tx,
  data: Record<string, unknown>,
  deps?: InboundJobDeps,
): Promise<AfterCommit | undefined> {
  const { inboundEventId } = jobData.parse(data);
  const stored = await tx.inboundEvent.findUniqueOrThrow({ where: { id: inboundEventId } });
  if (stored.processedAt || !stored.channelId) return undefined;
  const events = parseStoredEvents(stored.provider, stored.payload);
  const { alerts, turns, usage, media, channelDown } = await applyInboundEvents(tx, {
    tenantId: stored.tenantId,
    channelId: stored.channelId,
    events,
  });
  for (const { code } of alerts) {
    deps?.alert(AlertEvent.deliveryFailure, { tenantId: stored.tenantId, code });
  }
  await tx.inboundEvent.update({
    where: { id: stored.id },
    data: { processedAt: new Date(), error: null },
  });
  return async () => {
    if (channelDown) deps?.channelDown?.(stored.tenantId);
    for (const notice of usage) deps?.notifyUsage?.(stored.tenantId, notice);
    for (const messageId of media) await deps?.scheduleMedia?.(stored.tenantId, messageId);
    for (const turn of turns) await deps?.scheduleTurn(stored.tenantId, turn);
  };
}
