import { parseCloudChanges } from '@app/channels';
import type { AfterCommit, Tx } from '@app/db';
import * as z from 'zod';
import type { TurnRequest } from '../conversation/schedule.ts';
import type { UsageNotice } from '../usage/counters.ts';
import { applyInboundEvents } from './apply.ts';

const jobData = z.object({ inboundEventId: z.uuid() });

const DELIVERY_ALERT = 'whatsapp delivery failed: operator action needed';

export interface InboundJobDeps {
  /** RF-25 alert; ponytail: an error log, routed to Sentry/Axiom in E-26. */
  alert: (fields: object, message: string) => void;
  /** Queues the turn (E-11). Runs after commit, so the turn sees the new turn_version. */
  scheduleTurn: (tenantId: string, request: TurnRequest) => Promise<void>;
  /** Pushes the 80% and 100% franchise warnings (E-18). */
  notifyUsage?: (tenantId: string, notice: UsageNotice) => void;
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
  const events = parseCloudChanges(stored.payload);
  const { alerts, turns, usage } = await applyInboundEvents(tx, {
    tenantId: stored.tenantId,
    channelId: stored.channelId,
    events,
  });
  for (const alert of alerts) deps?.alert({ tenantId: stored.tenantId, ...alert }, DELIVERY_ALERT);
  await tx.inboundEvent.update({
    where: { id: stored.id },
    data: { processedAt: new Date(), error: null },
  });
  return async () => {
    for (const notice of usage) deps?.notifyUsage?.(stored.tenantId, notice);
    for (const turn of turns) await deps?.scheduleTurn(stored.tenantId, turn);
  };
}
