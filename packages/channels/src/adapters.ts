import { createCloudClient } from './cloud-api/client.ts';
import { parseCloudWebhook } from './cloud-api/parse.ts';
import { verifySignature } from './cloud-api/signature.ts';
import type { ChannelAdapter } from './types.ts';
import { createWahaClient, type WahaClientConfig } from './waha/client.ts';
import { parseWahaWebhook } from './waha/parse.ts';
import { verifyWahaSignature, WAHA_HMAC_HEADER } from './waha/signature.ts';

// Spec 03, "Abstração de canal": both connections behind the same interface; the domain never
// knows which one is in use. The same contract suite runs on both (channel-contract.ts).

const CLOUD_SIGNATURE_HEADER = 'x-hub-signature-256';

export interface CloudAdapterConfig {
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  fetch?: typeof fetch | undefined;
}

export function createCloudAdapter(config: CloudAdapterConfig): ChannelAdapter {
  return {
    ...createCloudClient(config),
    verifyWebhook: (body, headers) =>
      verifySignature(body, headers[CLOUD_SIGNATURE_HEADER], config.appSecret),
    parseWebhook: parseCloudWebhook,
  };
}

export interface WahaAdapterConfig extends WahaClientConfig {
  /** HMAC key WAHA signs webhooks with (WHATSAPP_HOOK_HMAC_KEY in the container). */
  webhookSecret: string;
}

export function createWahaAdapter(config: WahaAdapterConfig): ChannelAdapter {
  return {
    ...createWahaClient(config),
    verifyWebhook: (body, headers) =>
      verifyWahaSignature(body, headers[WAHA_HMAC_HEADER], config.webhookSecret),
    parseWebhook: parseWahaWebhook,
  };
}
