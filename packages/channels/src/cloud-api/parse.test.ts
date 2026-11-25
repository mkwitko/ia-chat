import { describe, expect, it } from 'vitest';
import {
  accountDisconnected,
  asBody,
  bsuidOnlyMessage,
  mediaMessages,
  OTHER_PHONE_NUMBER_ID,
  ownerEcho,
  PHONE_NUMBER_ID,
  statuses,
  textMessage,
  twoAccounts,
  WABA_ID,
} from '../fixtures/cloud-webhooks.ts';
import { InboundKind } from '../types.ts';
import { parseCloudChanges, parseCloudWebhook } from './parse.ts';

const eventsOf = (payload: object) =>
  parseCloudWebhook(asBody(payload)).flatMap((batch) => batch.events);

describe('Cloud API webhook normalization', () => {
  it('reads a patient text with BSUID, phone and profile name', () => {
    expect(parseCloudWebhook(asBody(textMessage))).toMatchObject([
      {
        accountId: PHONE_NUMBER_ID,
        events: [
          {
            kind: 'message',
            providerMessageId: 'wamid.TEXT1',
            contact: { bsuid: 'BR.1A2B3C4D5E', phoneE164: '+5541999990001', name: 'Joana Exemplo' },
            at: new Date(1798981200 * 1000),
            content: { type: 'text', text: 'oi, quanto custa a avaliação?' },
          },
        ],
      },
    ]);
  });

  it('keeps a patient known only by BSUID', () => {
    const [event] = eventsOf(bsuidOnlyMessage);
    expect(event).toMatchObject({
      kind: 'message',
      contact: { bsuid: 'BR.9Z8Y7X', phoneE164: undefined, name: 'Carlos' },
    });
  });

  it('maps media, location and button replies; anything else is unsupported', () => {
    expect(
      eventsOf(mediaMessages).map((event) =>
        event.kind === InboundKind.message ? event.content : null,
      ),
    ).toEqual([
      {
        type: 'audio',
        mediaId: 'media-audio-1',
        mime: 'audio/ogg; codecs=opus',
        caption: undefined,
      },
      { type: 'image', mediaId: 'media-image-1', mime: 'image/jpeg', caption: 'meu exame' },
      { type: 'location', lat: -25.43, lng: -49.27 },
      { type: 'interactive_reply', id: 'confirmar', title: 'Confirmar' },
      { type: 'unsupported', raw: 'reaction' },
    ]);
  });

  it('reads delivery statuses with the error code and skips ones we do not track', () => {
    expect(eventsOf(statuses)).toEqual([
      {
        kind: 'status',
        providerMessageId: 'wamid.OUT1',
        status: 'delivered',
        error: undefined,
        pricing: { billable: false, category: 'service', type: 'free_customer_service' },
        at: new Date(1798981400 * 1000),
      },
      {
        kind: 'status',
        providerMessageId: 'wamid.OUT2',
        status: 'failed',
        error: { code: '131047', title: 'Re-engagement message' },
        at: new Date(1798981401 * 1000),
      },
    ]);
  });

  it('turns a coexistence echo into an owner_echo addressed to the patient', () => {
    const [event] = eventsOf(ownerEcho);
    expect(event).toMatchObject({
      kind: 'owner_echo',
      providerMessageId: 'wamid.ECHO1',
      contact: { bsuid: 'BR.1A2B3C4D5E', phoneE164: '+5541999990001' },
      content: { type: 'text', text: 'Oi Joana, aqui é o Rafael. Te ligo já.' },
    });
  });

  it('reports a coexistence disconnection under the WABA id', () => {
    const [batch] = parseCloudWebhook(asBody(accountDisconnected));
    expect(batch).toMatchObject({
      accountId: WABA_ID,
      events: [{ kind: 'channel_state', state: 'disconnected' }],
    });
  });

  it('splits one delivery into one batch per phone number, each with only its own raw part', () => {
    const batches = parseCloudWebhook(asBody(twoAccounts));
    expect(batches.map((batch) => batch.accountId)).toEqual([
      PHONE_NUMBER_ID,
      OTHER_PHONE_NUMBER_ID,
    ]);
    expect(JSON.stringify(batches[0]?.raw)).not.toContain('5511988887777');
    expect(JSON.stringify(batches[1]?.raw)).not.toContain('5541999990001');
  });

  it('re-reads the raw part stored for one account into the same events', () => {
    const [batch] = parseCloudWebhook(asBody(ownerEcho));
    expect(parseCloudChanges(batch?.raw)).toEqual(batch?.events);
  });

  it('rejects a body that is not a WhatsApp webhook', () => {
    expect(() => parseCloudWebhook(Buffer.from('{"foo":1}'))).toThrow();
  });
});
