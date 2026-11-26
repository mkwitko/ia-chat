import * as z from 'zod';

// WAHA webhook body (waha.devlike.pro "Events", read 26/11/2026). Only the fields we use;
// the rest (including `_data`, engine internals) passes through untouched.

export const WahaEvent = {
  messageAny: 'message.any',
  ack: 'message.ack',
  sessionStatus: 'session.status',
} as const;

export const WahaSessionStatus = {
  stopped: 'STOPPED',
  starting: 'STARTING',
  scanQr: 'SCAN_QR_CODE',
  working: 'WORKING',
  failed: 'FAILED',
} as const;

/** whatsmeow's MessageInfo inside GOWS's `_data` (nv: confirm with the first real payload). */
const engineData = z
  .object({
    Info: z
      .object({
        PushName: z.string().optional(),
        SenderAlt: z.string().optional(),
        RecipientAlt: z.string().optional(),
      })
      .optional(),
  })
  .optional();

export const wahaMessageSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number(),
  from: z.string(),
  to: z.string().optional(),
  fromMe: z.boolean(),
  source: z.string().optional(),
  body: z.string().nullish(),
  hasMedia: z.boolean().optional(),
  media: z.object({ url: z.string().nullish(), mimetype: z.string().nullish() }).nullish(),
  _data: engineData.nullish().catch(undefined),
});
export type WahaMessage = z.infer<typeof wahaMessageSchema>;

export const wahaAckSchema = z.object({ id: z.string().min(1), ack: z.number() });

export const wahaStatusSchema = z.object({ status: z.string() });

export const wahaBodySchema = z.object({
  event: z.string().min(1),
  session: z.string().min(1),
  payload: z.unknown(),
});
export type WahaBody = z.infer<typeof wahaBodySchema>;
