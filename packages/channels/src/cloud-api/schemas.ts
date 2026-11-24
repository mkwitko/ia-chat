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

const contactSchema = z.object({
  wa_id: z.string().optional(),
  user_id: z.string().optional(),
  profile: z.object({ name: z.string().optional() }).optional(),
});

const statusSchema = z.object({
  id: z.string(),
  status: z.string(),
  timestamp: z.string(),
  errors: z.array(z.object({ code: z.number(), title: z.string().optional() })).optional(),
});

export const valueSchema = z.looseObject({
  metadata: z.object({ phone_number_id: z.string() }).optional(),
  contacts: z.array(contactSchema).optional(),
  messages: z.array(inboundMessageSchema).optional(),
  message_echoes: z.array(echoSchema).optional(),
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
