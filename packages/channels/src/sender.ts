import { randomUUID } from 'node:crypto';
import { ChannelKind, type Tx } from '@app/db';
import { createCloudClient } from './cloud-api/client.ts';
import type { ContactRef, TemplateRef } from './types.ts';

const DEV_PREFIX = 'dev.';
const DEV_SENT = 'dev sender: message not sent to WhatsApp';
const NOT_CLOUD = 'only the Cloud API channel can send for now (QR code: E-09b)';

export interface SenderConfig {
  /** Our own system-user token (test or pilot number): used when the channel has none. */
  accessToken: string | undefined;
  /** Decrypts a channel's own token from Embedded Signup (E-24); absent without META_TOKEN_KEY. */
  readChannelToken?: ((stored: string) => string) | undefined;
  /** Without a token in development: log instead of sending, so the flow can be tried locally. */
  devFallback: boolean;
  log: (fields: object, message: string) => void;
}

/** Sends one text to the patient of a conversation. Used by the worker and by the panel. */
export type ChannelSend = (
  tx: Tx,
  input: { conversationId: string; text: string },
) => Promise<{ providerMessageId: string }>;

/** Sends one approved template (outside the 24 h window), same target rules as `ChannelSend`. */
export type ChannelSendTemplate = (
  tx: Tx,
  input: { conversationId: string; template: TemplateRef; vars: readonly string[] },
) => Promise<{ providerMessageId: string }>;

type Target = { client: ReturnType<typeof createCloudClient>; to: ContactRef } | { dev: true };

async function targetOf(tx: Tx, config: SenderConfig, conversationId: string): Promise<Target> {
  const conversation = await tx.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { contact: true, channel: true },
  });
  const { channel, contact } = conversation;
  const accessToken = tokenOf(config, channel.accessTokenEnc);
  if (!accessToken && config.devFallback) return { dev: true };
  if (channel.kind !== ChannelKind.cloud_api || !channel.phoneNumberId || !accessToken)
    throw new Error(NOT_CLOUD);
  const client = createCloudClient({ phoneNumberId: channel.phoneNumberId, accessToken });
  return {
    client,
    to: { bsuid: contact.bsuid ?? undefined, phoneE164: contact.phoneE164 ?? undefined },
  };
}

/** The channel's own token when it has one, else ours. */
export function tokenOf(
  config: Pick<SenderConfig, 'accessToken' | 'readChannelToken'>,
  stored: string | null,
): string | undefined {
  return stored && config.readChannelToken ? config.readChannelToken(stored) : config.accessToken;
}

function devResult(config: SenderConfig, conversationId: string, characters: number) {
  config.log({ conversationId, characters }, DEV_SENT); // never the content (RN-38)
  return { providerMessageId: DEV_PREFIX + randomUUID() };
}

export function createChannelSender(config: SenderConfig): ChannelSend {
  return async (tx, { conversationId, text }) => {
    const target = await targetOf(tx, config, conversationId);
    if ('dev' in target) return devResult(config, conversationId, text.length);
    return target.client.sendText(target.to, text);
  };
}

export function createTemplateSender(config: SenderConfig): ChannelSendTemplate {
  return async (tx, { conversationId, template, vars }) => {
    const target = await targetOf(tx, config, conversationId);
    if ('dev' in target) return devResult(config, conversationId, vars.join('').length);
    return target.client.sendTemplate(target.to, template, vars);
  };
}
