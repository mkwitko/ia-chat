import { randomUUID } from 'node:crypto';
import { ChannelKind, type Tx } from '@app/db';
import { createCloudClient } from './cloud-api/client.ts';
import type { ContactRef, SendResult, TemplateRef } from './types.ts';
import { createWahaClient } from './waha/client.ts';
import { passQrGate } from './waha/gate.ts';
import type { WahaConfig } from './waha/http.ts';
import { QrSendKind } from './waha/limits.ts';

const DEV_PREFIX = 'dev.';
const DEV_SENT = 'dev sender: message not sent to WhatsApp';
const NOT_CLOUD = 'the Cloud API channel has no token to send with';
const NO_GATEWAY = 'the QR code channel needs WAHA_URL and WAHA_API_KEY';

export interface SenderConfig {
  /** Our own system-user token (test or pilot number): used when the channel has none. */
  accessToken: string | undefined;
  /** Decrypts a channel's own token from Embedded Signup (E-24); absent without META_TOKEN_KEY. */
  readChannelToken?: ((stored: string) => string) | undefined;
  /** The WAHA gateway for QR code channels (E-09b); absent when not configured. */
  waha?: WahaConfig | undefined;
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

interface Client {
  sendText(to: ContactRef, text: string): Promise<SendResult>;
  sendTemplate(to: ContactRef, template: TemplateRef, vars: readonly string[]): Promise<SendResult>;
}
type Target = { client: Client; to: ContactRef } | { dev: true };

async function targetOf(
  tx: Tx,
  config: SenderConfig,
  input: { conversationId: string; kind: QrSendKind },
): Promise<Target> {
  const conversation = await tx.conversation.findUniqueOrThrow({
    where: { id: input.conversationId },
    include: { contact: true, channel: true },
  });
  const { channel, contact } = conversation;
  const to = { bsuid: contact.bsuid ?? undefined, phoneE164: contact.phoneE164 ?? undefined };
  if (channel.kind === ChannelKind.qr_gateway) {
    if (!config.waha || !channel.gatewaySession) return devOr(config, NO_GATEWAY);
    const gate = { channelId: channel.id, contactId: contact.id, kind: input.kind };
    await passQrGate(tx, { ...gate, now: new Date() });
    return { client: createWahaClient({ ...config.waha, session: channel.gatewaySession }), to };
  }
  const accessToken = tokenOf(config, channel.accessTokenEnc);
  if (!accessToken) return devOr(config, NOT_CLOUD);
  if (!channel.phoneNumberId) throw new Error(NOT_CLOUD);
  return { client: createCloudClient({ phoneNumberId: channel.phoneNumberId, accessToken }), to };
}

function devOr(config: SenderConfig, reason: string): Target {
  if (config.devFallback) return { dev: true };
  throw new Error(reason);
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
    const target = await targetOf(tx, config, { conversationId, kind: QrSendKind.text });
    if ('dev' in target) return devResult(config, conversationId, text.length);
    return target.client.sendText(target.to, text);
  };
}

export function createTemplateSender(config: SenderConfig): ChannelSendTemplate {
  return async (tx, { conversationId, template, vars }) => {
    const target = await targetOf(tx, config, { conversationId, kind: QrSendKind.template });
    if ('dev' in target) return devResult(config, conversationId, vars.join('').length);
    return target.client.sendTemplate(target.to, template, vars);
  };
}
