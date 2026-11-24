import { describe, expect, it } from 'vitest';
import { CloudApiError, createCloudClient } from './client.ts';

interface Call {
  url: string;
  init: RequestInit | undefined;
}

function fakeGraph(responses: { status: number; body: unknown }[]) {
  const calls: Call[] = [];
  const fetch = (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: url instanceof Request ? url.url : url.toString(), init });
    const next = responses.shift() ?? { status: 200, body: {} };
    return Promise.resolve(new Response(JSON.stringify(next.body), { status: next.status }));
  };
  return { calls, fetch };
}

const client = (fetch: typeof globalThis.fetch) =>
  createCloudClient({ phoneNumberId: '106540352242922', accessToken: 'token-de-teste', fetch });
const bodyOf = (call: Call | undefined) =>
  JSON.parse(call?.init?.body as string) as Record<string, unknown>;

describe('Cloud API client', () => {
  it('sends text to the phone with the bearer token and returns the wamid', async () => {
    const graph = fakeGraph([{ status: 200, body: { messages: [{ id: 'wamid.SENT1' }] } }]);
    const result = await client(graph.fetch).sendText(
      { phoneE164: '+5541999990001', bsuid: 'BR.X' },
      'Olá!',
      { replyTo: 'wamid.IN' },
    );
    expect(result).toEqual({ providerMessageId: 'wamid.SENT1' });
    expect(graph.calls[0]?.url).toBe('https://graph.facebook.com/v27.0/106540352242922/messages');
    expect(new Headers(graph.calls[0]?.init?.headers).get('authorization')).toBe(
      'Bearer token-de-teste',
    );
    expect(bodyOf(graph.calls[0])).toMatchObject({
      to: '5541999990001',
      type: 'text',
      text: { body: 'Olá!' },
      context: { message_id: 'wamid.IN' },
    });
  });

  it('falls back to the BSUID when the phone is hidden', async () => {
    const graph = fakeGraph([{ status: 200, body: { messages: [{ id: 'wamid.SENT2' }] } }]);
    await client(graph.fetch).sendText({ bsuid: 'BR.ONLY' }, 'oi');
    expect(bodyOf(graph.calls[0])).toMatchObject({ to: 'BR.ONLY' });
  });

  it('sends a template with body variables', async () => {
    const graph = fakeGraph([{ status: 200, body: { messages: [{ id: 'wamid.TPL' }] } }]);
    await client(graph.fetch).sendTemplate(
      { phoneE164: '+5541999990001' },
      { name: 'lembrete_consulta', language: 'pt_BR' },
      ['Joana', 'quinta, 07/01, 15:00'],
    );
    expect(bodyOf(graph.calls[0])).toMatchObject({
      type: 'template',
      template: {
        name: 'lembrete_consulta',
        language: { code: 'pt_BR' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Joana' },
              { type: 'text', text: 'quinta, 07/01, 15:00' },
            ],
          },
        ],
      },
    });
  });

  it('marks read with the typing indicator', async () => {
    const graph = fakeGraph([{ status: 200, body: { success: true } }]);
    await client(graph.fetch).markReadAndTyping('wamid.IN');
    expect(bodyOf(graph.calls[0])).toEqual({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: 'wamid.IN',
      typing_indicator: { type: 'text' },
    });
  });

  it('downloads media through the short-lived URL', async () => {
    const graph = fakeGraph([
      { status: 200, body: { url: 'https://lookaside.example/media-1', mime_type: 'audio/ogg' } },
      { status: 200, body: 'bytes' },
    ]);
    const media = await client(graph.fetch).downloadMedia('media-1');
    expect(media.mime).toBe('audio/ogg');
    expect(graph.calls.map((call) => call.url)).toEqual([
      'https://graph.facebook.com/v27.0/media-1',
      'https://lookaside.example/media-1',
    ]);
  });

  it('turns a Graph error into CloudApiError with the Meta code', async () => {
    const graph = fakeGraph([
      { status: 400, body: { error: { code: 131047, message: 'Re-engagement message' } } },
    ]);
    await expect(
      client(graph.fetch).sendText({ phoneE164: '+5541999990001' }, 'oi'),
    ).rejects.toMatchObject(new CloudApiError(400, '131047', 'Re-engagement message'));
  });
});
