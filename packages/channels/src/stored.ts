import { parseCloudChanges } from './cloud-api/parse.ts';
import type { InboundEvent } from './types.ts';
import { parseWahaEvents } from './waha/parse.ts';

/** `inbound_events.provider`: which parser reads the stored raw part. */
export const InboundProvider = { cloud: 'whatsapp_cloud', waha: 'waha' } as const;
export type InboundProvider = (typeof InboundProvider)[keyof typeof InboundProvider];

/** The worker side of RF-21, whatever the connection. */
export function parseStoredEvents(provider: string, raw: unknown): InboundEvent[] {
  return provider === InboundProvider.waha ? parseWahaEvents(raw) : parseCloudChanges(raw);
}
