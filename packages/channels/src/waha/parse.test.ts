import { describe, expect, it } from 'vitest';
import * as fx from '../fixtures/waha-webhooks.ts';
import { ChannelState, DeliveryStatus, InboundKind } from '../types.ts';
import { parseWahaEvents, parseWahaWebhook } from './parse.ts';

const body = (payload: object) => Buffer.from(JSON.stringify(payload));
const eventsOf = (payload: object) => parseWahaWebhook(body(payload)).flatMap((b) => b.events);

describe('WAHA webhook parsing (E-09b, "primeiro dia")', () => {
  it('routes by session and keeps the raw body for the worker', () => {
    const [batch] = parseWahaWebhook(body(fx.wahaText));
    expect(batch?.accountId).toBe(fx.SESSION);
    expect(parseWahaEvents(batch?.raw)).toEqual(batch?.events);
    expect(parseWahaWebhook(body(fx.wahaOtherSession))[0]?.accountId).toBe(fx.OTHER_SESSION);
  });

  it('reads a patient message with the phone and the push name', () => {
    expect(eventsOf(fx.wahaText)).toEqual([
      {
        kind: InboundKind.message,
        providerMessageId: fx.wahaText.payload.id,
        contact: { phoneE164: '+5541999990001', bsuid: undefined, name: 'Joana Exemplo' },
        at: new Date(1798981200 * 1000),
        content: { type: 'text', text: 'oi, quanto custa a avaliação?' },
      },
    ]);
  });

  it('owner echo: a message the owner typed on the phone, keyed by the patient', () => {
    const [echo] = eventsOf(fx.wahaOwnerEcho);
    expect(echo).toMatchObject({
      kind: InboundKind.ownerEcho,
      providerMessageId: fx.wahaOwnerEcho.payload.id,
      contact: { phoneE164: '+5541999990001' },
    });
  });

  it('LID: the phone comes from SenderAlt when GOWS sends it, else the LID alone', () => {
    expect(eventsOf(fx.wahaLidText)[0]).toMatchObject({
      contact: { phoneE164: '+5541999990001', bsuid: 'lid:123456789012345' },
    });
    expect(eventsOf(fx.wahaLidOnly)[0]).toMatchObject({
      contact: { phoneE164: undefined, bsuid: 'lid:123456789012345' },
    });
  });

  it('ignores our own API sends and groups', () => {
    expect(eventsOf(fx.wahaApiEcho)).toEqual([]);
    expect(eventsOf(fx.wahaGroupMessage)).toEqual([]);
  });

  it('media: the file URL is the media id, with its mime type', () => {
    expect(eventsOf(fx.wahaAudio)[0]).toMatchObject({
      content: {
        type: 'audio',
        mediaId: fx.wahaAudio.payload.media.url,
        mime: 'audio/ogg; codecs=opus',
      },
    });
  });

  it('acks become delivery statuses', () => {
    expect(eventsOf(fx.wahaDelivered)[0]).toMatchObject({
      kind: InboundKind.status,
      providerMessageId: fx.wahaDelivered.payload.id,
      status: DeliveryStatus.delivered,
    });
    expect(eventsOf(fx.wahaAckError)[0]).toMatchObject({ status: DeliveryStatus.failed });
  });

  it('session status: WORKING connects; FAILED or asking for a QR code disconnects', () => {
    expect(eventsOf(fx.wahaWorking)[0]).toMatchObject({ state: ChannelState.connected });
    expect(eventsOf(fx.wahaFailed)[0]).toMatchObject({ state: ChannelState.disconnected });
    expect(eventsOf(fx.wahaScanQr)[0]).toMatchObject({ state: ChannelState.disconnected });
  });

  it('rejects a body that is not a WAHA event', () => {
    expect(() => parseWahaWebhook(body({ hello: 'world' }))).toThrow();
  });
});
