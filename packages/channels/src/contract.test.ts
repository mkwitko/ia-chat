import { createHmac } from 'node:crypto';
import { createCloudAdapter, createWahaAdapter } from './adapters.ts';
import { describe, it } from 'vitest';
import { contractCases, scriptedFetch, type ContractHarness } from './channel-contract.ts';
import * as cloud from './fixtures/cloud-webhooks.ts';
import * as waha from './fixtures/waha-webhooks.ts';
import { signWahaBody } from './waha/signature.ts';

const PATIENT = { phoneE164: '+5541999990001' };
const BYTES = Buffer.from('fake-ogg-bytes');
const OGG = 'audio/ogg';
const json = (body: unknown) => new Response(JSON.stringify(body));
const body = (payload: object) => Buffer.from(JSON.stringify(payload));

const APP_SECRET = 'app-secret-de-teste';
const cloudHarness: ContractHarness = {
  name: 'Cloud API',
  adapter: (fetch) =>
    createCloudAdapter({
      phoneNumberId: cloud.PHONE_NUMBER_ID,
      accessToken: 'token-de-teste',
      appSecret: APP_SECRET,
      fetch,
    }),
  sign: (bytes) => ({
    'x-hub-signature-256': `sha256=${createHmac('sha256', APP_SECRET).update(bytes).digest('hex')}`,
  }),
  accountId: cloud.PHONE_NUMBER_ID,
  patient: PATIENT,
  bodies: {
    patientText: body(cloud.textMessage),
    ownerEcho: body(cloud.ownerEcho),
    delivered: body(cloud.statuses),
    disconnected: body(cloud.accountDisconnected),
  },
  sendHttp: () => scriptedFetch([json({ messages: [{ id: 'wamid.SENT1' }] })]),
  sentId: 'wamid.SENT1',
  mediaHttp: () =>
    scriptedFetch([
      json({ url: 'https://lookaside.example/media/1', mime_type: OGG }),
      new Response(BYTES),
    ]),
  mediaId: 'MEDIA1',
  mediaBytes: BYTES,
  mediaMime: OGG,
};

const HMAC_KEY = 'hmac-de-teste';
const wahaHarness: ContractHarness = {
  name: 'WAHA (QR code)',
  adapter: (fetch) =>
    createWahaAdapter({
      baseUrl: waha.WAHA_BASE_URL,
      apiKey: 'api-key-de-teste',
      session: waha.SESSION,
      webhookSecret: HMAC_KEY,
      fetch,
    }),
  sign: (bytes) => ({ 'x-webhook-hmac': signWahaBody(bytes, HMAC_KEY) }),
  accountId: waha.SESSION,
  patient: PATIENT,
  bodies: {
    patientText: body(waha.wahaText),
    ownerEcho: body(waha.wahaOwnerEcho),
    delivered: body(waha.wahaDelivered),
    disconnected: body(waha.wahaFailed),
  },
  sendHttp: () => scriptedFetch([json({ id: 'true_5541999990001@c.us_3EB0SENT1' })]),
  sentId: 'true_5541999990001@c.us_3EB0SENT1',
  mediaHttp: () => scriptedFetch([new Response(BYTES, { headers: { 'content-type': OGG } })]),
  mediaId: waha.wahaAudio.payload.media.url,
  mediaBytes: BYTES,
  mediaMime: OGG,
};

// E-09b: the QR code adapter passes the same contract as the Cloud API one.
for (const harness of [cloudHarness, wahaHarness]) {
  describe(`ChannelAdapter contract: ${harness.name}`, () => {
    for (const [name, run] of contractCases(harness)) it(name, run);
  });
}
