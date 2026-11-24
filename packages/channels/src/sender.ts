import { randomUUID } from 'node:crypto';
import { ChannelKind, type Tx } from '@app/db';
import { createCloudClient } from './cloud-api/client.ts';

const DEV_PREFIX = 'dev.';
const DEV_SENT = 'dev sender: message not sent to WhatsApp';
const NOT_CLOUD = 'only the Cloud API channel can send for now (QR code: E-09b)';

export interface SenderConfig {
  /** Meta system-user token. ponytail: one token from env until per-channel tokens (E-24). */
  accessToken: string | undefined;
  /** Without a token in development: log instead of sending, so the flow can be tried locally. */
  devFallback: boolean;
  log: (fields: object, message: string) => void;
}

/** Sends one text to the patient of a conversation. Used by the worker and by the panel. */
export type ChannelSend = (
  tx: Tx,
  input: { conversationId: string; text: string },
) => Promise<{ providerMessageId: string }>;

export function createChannelSender(config: SenderConfig): ChannelSend {
  return async (tx, { conversationId, text }) => {
    const conversation = await tx.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { contact: true, channel: true },
    });
    if (!config.accessToken && config.devFallback) {
      config.log({ conversationId, characters: text.length }, DEV_SENT); // never the content (RN-38)
      return { providerMessageId: DEV_PREFIX + randomUUID() };
    }
    const { channel, contact } = conversation;
    if (channel.kind !== ChannelKind.cloud_api || !channel.phoneNumberId || !config.accessToken)
      throw new Error(NOT_CLOUD);
    const client = createCloudClient({
      phoneNumberId: channel.phoneNumberId,
      accessToken: config.accessToken,
    });
    return client.sendText(
      { bsuid: contact.bsuid ?? undefined, phoneE164: contact.phoneE164 ?? undefined },
      text,
    );
  };
}
