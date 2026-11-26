import { expect } from 'vitest';
import {
  ChannelState,
  ContentType,
  DeliveryStatus,
  InboundKind,
  type ChannelAdapter,
  type ContactRef,
  type InboundEvent,
} from './types.ts';

// The contract every channel adapter passes (E-09 and E-09b): what the domain relies on,
// whatever the provider. Each adapter's test supplies its own bodies and fake HTTP.

export interface FakeHttp {
  fetch: typeof fetch;
  /** Every URL called, in order. */
  urls: string[];
}

export interface ContractHarness {
  name: string;
  adapter: (fetch: typeof globalThis.fetch) => ChannelAdapter;
  /** Signed webhook headers for a body. */
  sign: (body: Buffer) => Record<string, string>;
  accountId: string;
  patient: ContactRef & { phoneE164: string };
  bodies: { patientText: Buffer; ownerEcho: Buffer; delivered: Buffer; disconnected: Buffer };
  /** Answers one send with `sentId`. */
  sendHttp: () => FakeHttp;
  sentId: string;
  /** Answers the download of `mediaId` with `mediaBytes` typed `mediaMime`. */
  mediaHttp: () => FakeHttp;
  mediaId: string;
  mediaBytes: Buffer;
  mediaMime: string;
}

const firstEvent = (adapter: ChannelAdapter, body: Buffer): InboundEvent | undefined =>
  adapter.parseWebhook(body).flatMap((batch) => batch.events)[0];
const noFetch: typeof fetch = () => Promise.reject(new Error('no HTTP expected'));

export type ContractCase = [name: string, run: () => void | Promise<void>];

/** The cases, run by each adapter's test with `it`. */
export function contractCases(h: ContractHarness): ContractCase[] {
  return [...inboundCases(h), ...eventCases(h), ...outboundCases(h)];
}

function inboundCases(h: ContractHarness): ContractCase[] {
  const adapter = h.adapter(noFetch);
  return [
    [
      'accepts a signed webhook and rejects a changed or unsigned one',
      () => {
        const body = h.bodies.patientText;
        expect(adapter.verifyWebhook(body, h.sign(body))).toBe(true);
        expect(adapter.verifyWebhook(Buffer.concat([body, Buffer.from(' ')]), h.sign(body))).toBe(
          false,
        );
        expect(adapter.verifyWebhook(body, {})).toBe(false);
      },
    ],
    [
      'routes a patient message to its account, with the contact identifier',
      () => {
        const [batch] = adapter.parseWebhook(h.bodies.patientText);
        expect(batch?.accountId).toBe(h.accountId);
        expect(batch?.raw.length).toBeGreaterThan(0);
        expect(batch?.events[0]).toMatchObject({
          kind: InboundKind.message,
          contact: { phoneE164: h.patient.phoneE164 },
          content: { type: ContentType.text },
        });
      },
    ],
  ];
}

function eventCases(h: ContractHarness): ContractCase[] {
  const adapter = h.adapter(noFetch);
  return [
    [
      'reports what the owner typed on the phone as an owner echo for that patient',
      () => {
        expect(firstEvent(adapter, h.bodies.ownerEcho)).toMatchObject({
          kind: InboundKind.ownerEcho,
          contact: { phoneE164: h.patient.phoneE164 },
        });
      },
    ],
    [
      'turns delivery receipts into statuses and a dropped connection into a channel state',
      () => {
        expect(firstEvent(adapter, h.bodies.delivered)).toMatchObject({
          kind: InboundKind.status,
          status: DeliveryStatus.delivered,
        });
        expect(firstEvent(adapter, h.bodies.disconnected)).toMatchObject({
          kind: InboundKind.channelState,
          state: ChannelState.disconnected,
        });
      },
    ],
  ];
}

function outboundCases(h: ContractHarness): ContractCase[] {
  return [
    [
      'sends text and returns the provider message id',
      async () => {
        const http = h.sendHttp();
        const sent = await h.adapter(http.fetch).sendText(h.patient, 'Olá!');
        expect(sent).toEqual({ providerMessageId: h.sentId });
      },
    ],
    [
      'downloads inbound media as bytes with the mime type',
      async () => {
        const http = h.mediaHttp();
        const media = await h.adapter(http.fetch).downloadMedia(h.mediaId);
        expect(media.bytes.equals(h.mediaBytes)).toBe(true);
        expect(media.mime).toBe(h.mediaMime);
      },
    ],
  ];
}

/** A fetch answering each call with the next response, recording the URLs. */
export function scriptedFetch(responses: Response[]): FakeHttp {
  const urls: string[] = [];
  const fetch = (url: string | URL | Request) => {
    urls.push(url instanceof Request ? url.url : url.toString());
    return Promise.resolve(responses.shift() ?? new Response('{}'));
  };
  return { fetch, urls };
}
