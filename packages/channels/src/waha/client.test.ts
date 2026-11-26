import { describe, expect, it } from 'vitest';
import { scriptedFetch } from '../channel-contract.ts';
import { SESSION, WAHA_BASE_URL } from '../fixtures/waha-webhooks.ts';
import { chatIdOf, createWahaClient, renderTemplate } from './client.ts';

const json = (body: unknown) => new Response(JSON.stringify(body));
const client = (fetch: typeof globalThis.fetch) =>
  createWahaClient({ baseUrl: WAHA_BASE_URL, apiKey: 'chave', session: SESSION, fetch });

describe('WAHA client', () => {
  it('addresses the phone first, the LID otherwise', () => {
    expect(chatIdOf({ phoneE164: '+5541999990001', bsuid: 'lid:123' })).toBe('5541999990001@c.us');
    expect(chatIdOf({ bsuid: 'lid:123' })).toBe('123@lid');
    expect(() => chatIdOf({ bsuid: 'BR.META' })).toThrow();
  });

  it('sends an approved template as plain text with its values', async () => {
    const http = scriptedFetch([json({ key: { id: '3EB0K1' } })]);
    const template = { name: 'lembrete', language: 'pt_BR', body: 'Lembrete: {{1}} às {{3}}.' };
    const sent = await client(http.fetch).sendTemplate({ phoneE164: '+5541999990001' }, template, [
      'Avaliação',
      'amanhã',
      '14:00',
    ]);
    expect(sent.providerMessageId).toBe('true_5541999990001@c.us_3EB0K1');
    expect(http.urls).toEqual([`${WAHA_BASE_URL}/api/sendText`]);
    expect(renderTemplate(template, ['A', 'B', 'C'])).toBe('Lembrete: A às C.');
    expect(() => renderTemplate({ name: 'x', language: 'pt_BR' }, [])).toThrow();
  });

  it('marks seen and shows typing in the chat the message came from', async () => {
    const http = scriptedFetch([json({}), json({})]);
    await client(http.fetch).markReadAndTyping('false_5541999990001@c.us_3EB0IN1');
    expect(http.urls).toEqual([
      `${WAHA_BASE_URL}/api/sendSeen`,
      `${WAHA_BASE_URL}/api/startTyping`,
    ]);
  });

  it('downloads only files WAHA itself serves', async () => {
    const http = scriptedFetch([]);
    await expect(client(http.fetch).downloadMedia('https://elsewhere.example/x')).rejects.toThrow();
    expect(http.urls).toEqual([]);
  });
});
