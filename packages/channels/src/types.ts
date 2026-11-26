// Channel abstraction (spec 03, "Abstração de canal"). The domain never imports Meta types.

export const InboundKind = {
  message: 'message',
  ownerEcho: 'owner_echo',
  status: 'status',
  channelState: 'channel_state',
} as const;

export const ContentType = {
  text: 'text',
  audio: 'audio',
  image: 'image',
  document: 'document',
  sticker: 'sticker',
  location: 'location',
  interactiveReply: 'interactive_reply',
  unsupported: 'unsupported',
} as const;

export const DeliveryStatus = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
} as const;
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

export const ChannelState = {
  connected: 'connected',
  disconnected: 'disconnected',
  restricted: 'restricted',
} as const;
export type ChannelState = (typeof ChannelState)[keyof typeof ChannelState];

/** RF-23b: the patient is known by BSUID first; the phone may be missing. */
export interface ContactRef {
  bsuid?: string | undefined;
  phoneE164?: string | undefined;
  name?: string | undefined;
}

export type MediaType =
  | typeof ContentType.audio
  | typeof ContentType.image
  | typeof ContentType.document
  | typeof ContentType.sticker;

export type MessageContent =
  | { type: typeof ContentType.text; text: string }
  | { type: MediaType; mediaId: string; mime: string; caption?: string | undefined }
  | { type: typeof ContentType.location; lat: number; lng: number }
  | { type: typeof ContentType.interactiveReply; id: string; title: string }
  | { type: typeof ContentType.unsupported; raw: string };

export interface ProviderError {
  code: string;
  title?: string | undefined;
}

export type InboundEvent =
  | {
      kind: typeof InboundKind.message;
      providerMessageId: string;
      contact: ContactRef;
      at: Date;
      content: MessageContent;
    }
  | {
      kind: typeof InboundKind.ownerEcho;
      providerMessageId: string;
      contact: ContactRef;
      at: Date;
      content: MessageContent;
    }
  | {
      kind: typeof InboundKind.status;
      providerMessageId: string;
      status: DeliveryStatus;
      error?: ProviderError | undefined;
      /** What Meta charged for this message, when the status carries it (H-05). */
      pricing?: MessagePricing | undefined;
      at: Date;
    }
  | { kind: typeof InboundKind.channelState; state: ChannelState; at: Date };

export interface MessagePricing {
  billable: boolean;
  /** As Meta sent it: service, utility, marketing... */
  category: string;
  type?: string | undefined;
}

/** Events of one provider account (Cloud API phone_number_id), routed to one channel. */
export interface InboundBatch {
  accountId: string;
  events: InboundEvent[];
  /** This account's share of the raw body: stored per tenant, never another tenant's data. */
  raw: unknown[];
}

export interface SendResult {
  providerMessageId: string;
}

export interface TemplateRef {
  name: string;
  language: string;
  /** The approved text with {{n}} placeholders: the QR code channel sends it as plain text. */
  body?: string | undefined;
}

export interface ChannelAdapter {
  verifyWebhook(rawBody: Buffer, headers: Readonly<Record<string, string | undefined>>): boolean;
  parseWebhook(rawBody: Buffer): InboundBatch[];
  sendText(to: ContactRef, text: string, opts?: { replyTo?: string }): Promise<SendResult>;
  sendTemplate(to: ContactRef, template: TemplateRef, vars: readonly string[]): Promise<SendResult>;
  markReadAndTyping(providerMessageId: string): Promise<void>;
  downloadMedia(mediaId: string): Promise<{ bytes: Buffer; mime: string }>;
}
