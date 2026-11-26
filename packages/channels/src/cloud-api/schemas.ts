import * as z from 'zod';

// Subset of the Cloud API webhook we read (developers.facebook.com, WhatsApp webhooks,
// checked 24/11/2026 in research 01). Unknown fields pass through untouched.

const media = z.object({ id: z.string(), mime_type: z.string(), caption: z.string().optional() });

export const inboundMessageSchema = z.looseObject({
  id: z.string(),
  timestamp: z.string(),
  type: z.string(),
  from: z.string().optional(),
  from_user_id: z.string().optional(),
  text: z.object({ body: z.string() }).optional(),
  audio: media.optional(),
  image: media.optional(),
  document: media.optional(),
  sticker: media.optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  interactive: z
    .object({
      button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
    })
    .optional(),
  button: z.object({ payload: z.string(), text: z.string() }).optional(),
});
export type InboundMessage = z.infer<typeof inboundMessageSchema>;

/** smb_message_echoes: what the owner sends from the WhatsApp Business app. */
export const echoSchema = inboundMessageSchema.extend({
  to: z.string().optional(),
  to_user_id: z.string().optional(),
});

/** history webhook: one chunk of threads, or the error when the owner did not share (2593109). */
const historyThreadSchema = z.object({
  id: z.string().optional(),
  context: z.object({ wa_id: z.string().optional(), user_id: z.string().optional() }).optional(),
  messages: z.array(inboundMessageSchema).default([]),
});
const historyChunkSchema = z.object({
  metadata: z.object({ progress: z.number().optional() }).optional(),
  threads: z.array(historyThreadSchema).default([]),
  errors: z.array(z.object({ code: z.number() })).optional(),
});
export type HistoryChunk = z.infer<typeof historyChunkSchema>;
export type HistoryThread = z.infer<typeof historyThreadSchema>;

/** smb_app_state_sync: one phone-book entry of the owner's Business app. */
const stateSyncSchema = z.object({
  type: z.string(),
  action: z.string().optional(),
  contact: z
    .object({
      full_name: z.string().optional(),
      phone_number: z.string().optional(),
      user_id: z.string().optional(),
    })
    .optional(),
  metadata: z.object({ timestamp: z.string().optional() }).optional(),
});
export type StateSync = z.infer<typeof stateSyncSchema>;

const contactSchema = z.object({
  wa_id: z.string().optional(),
  user_id: z.string().optional(),
  profile: z.object({ name: z.string().optional() }).optional(),
});

/** Present on the status that bills the message (H-05); category is service, utility, marketing... */
const pricingSchema = z.object({
  billable: z.boolean(),
  category: z.string(),
  type: z.string().optional(),
});

const statusSchema = z.object({
  id: z.string(),
  status: z.string(),
  timestamp: z.string(),
  errors: z.array(z.object({ code: z.number(), title: z.string().optional() })).optional(),
  pricing: pricingSchema.optional(),
});

export const valueSchema = z.looseObject({
  metadata: z.object({ phone_number_id: z.string() }).optional(),
  contacts: z.array(contactSchema).optional(),
  messages: z.array(inboundMessageSchema).optional(),
  message_echoes: z.array(echoSchema).optional(),
  history: z.array(historyChunkSchema).optional(),
  state_sync: z.array(stateSyncSchema).optional(),
  statuses: z.array(statusSchema).optional(),
  event: z.string().optional(),
  disconnection_info: z.object({ reason: z.string().optional() }).optional(),
});
export type WebhookValue = z.infer<typeof valueSchema>;
export type WebhookContact = z.infer<typeof contactSchema>;
export type WebhookStatus = z.infer<typeof statusSchema>;

export const changesSchema = z.array(z.object({ field: z.string(), value: valueSchema }));

export const webhookSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({ id: z.string(), changes: changesSchema })),
});
