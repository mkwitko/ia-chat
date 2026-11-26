import { describe, expect, it } from 'vitest';
import { asBody } from '../fixtures/cloud-webhooks.ts';
import {
  contactsSync,
  historyBsuidThread,
  historyChunk,
  historyDeclined,
} from '../fixtures/coexistence-sync.ts';
import { ContentType, InboundKind } from '../types.ts';
import { parseCloudChanges, parseCloudWebhook } from './parse.ts';

const PLACEHOLDER_ID = 'wamid.HIST3';
const eventsOf = (payload: object) =>
  parseCloudWebhook(asBody(payload)).flatMap((batch) => batch.events);

describe('coexistence history webhooks', () => {
  it('turns each thread message into a history message, owner or patient', () => {
    const messages = eventsOf(historyChunk).filter(
      (event) => event.kind === InboundKind.historyMessage,
    );
    expect(messages).toMatchObject([
      {
        providerMessageId: 'wamid.HIST1',
        fromOwner: false,
        contact: { phoneE164: '+5541999990001' },
        content: { type: 'text', text: 'Oi, vocês atendem aos sábados?' },
      },
      { providerMessageId: 'wamid.HIST2', fromOwner: true },
      { providerMessageId: 'wamid.HIST3', fromOwner: true },
      {
        providerMessageId: 'wamid.HIST4',
        fromOwner: true,
        contact: { phoneE164: '+5541999990002' },
      },
    ]);
  });

  it('never fetches media of the history: a placeholder is stored as unsupported', () => {
    const placeholder = eventsOf(historyChunk).find(
      (event) =>
        event.kind === InboundKind.historyMessage && event.providerMessageId === PLACEHOLDER_ID,
    );
    expect(placeholder).toMatchObject({ content: { type: ContentType.unsupported } });
  });

  it('reports the progress of the chunk', () => {
    const progress = eventsOf(historyChunk).find(
      (event) => event.kind === InboundKind.historyProgress,
    );
    expect(progress).toMatchObject({ progress: 55 });
  });

  it('knows a BSUID-only thread by the user id and marks the user as the author', () => {
    const message = eventsOf(historyBsuidThread).find(
      (event) => event.kind === InboundKind.historyMessage,
    );
    expect(message).toMatchObject({ fromOwner: false, contact: { bsuid: 'BR.9Z8Y7X' } });
  });

  it('flags a history the owner refused to share (error 2593109)', () => {
    expect(eventsOf(historyDeclined)).toMatchObject([{ kind: InboundKind.historyDeclined }]);
  });

  it('reads the phone book: name and phone, add and remove', () => {
    expect(eventsOf(contactsSync)).toMatchObject([
      {
        kind: InboundKind.contactSync,
        action: 'add',
        contact: { name: 'Joana Exemplo', phoneE164: '+5541999990001' },
      },
      { kind: InboundKind.contactSync, action: 'remove', contact: { phoneE164: '+5541999990002' } },
    ]);
  });

  it('re-reads the stored raw part into the same events (worker side)', () => {
    const [batch] = parseCloudWebhook(asBody(historyChunk));
    expect(parseCloudChanges(batch?.raw)).toEqual(batch?.events);
  });
});
