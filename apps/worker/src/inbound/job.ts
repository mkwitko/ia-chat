import { parseCloudChanges } from '@app/channels';
import type { Tx } from '@app/db';
import * as z from 'zod';
import { applyInboundEvents } from './apply.ts';

const jobData = z.object({ inboundEventId: z.uuid() });

const DELIVERY_ALERT = 'whatsapp delivery failed: operator action needed';

export interface InboundJobDeps {
  /** RF-25 alert; ponytail: an error log, routed to Sentry/Axiom in E-26. */
  alert: (fields: object, message: string) => void;
}

/** inbound.process: turns one stored webhook batch into messages and statuses (RF-21). */
export async function processInboundEvent(
  tx: Tx,
  data: Record<string, unknown>,
  deps?: InboundJobDeps,
): Promise<void> {
  const { inboundEventId } = jobData.parse(data);
  const stored = await tx.inboundEvent.findUniqueOrThrow({ where: { id: inboundEventId } });
  if (stored.processedAt || !stored.channelId) return;
  const events = parseCloudChanges(stored.payload);
  const alerts = await applyInboundEvents(tx, {
    tenantId: stored.tenantId,
    channelId: stored.channelId,
    events,
  });
  for (const alert of alerts) deps?.alert({ tenantId: stored.tenantId, ...alert }, DELIVERY_ALERT);
  await tx.inboundEvent.update({
    where: { id: stored.id },
    data: { processedAt: new Date(), error: null },
  });
}
