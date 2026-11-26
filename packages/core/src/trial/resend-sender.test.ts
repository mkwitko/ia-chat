import { describe, expect, it, vi } from 'vitest';
import { EMAIL_FROM, RESEND_API_URL, resendEmailSender } from './resend-sender.ts';

const KEY = 're_test_fake_key';
const MESSAGE = { to: 'ana@example.com', subject: 'Assunto', text: 'Corpo' };
const OK = 200;
const UNPROCESSABLE = 422;

function fakeFetch(status: number) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response('{}', { status })));
}

describe('resendEmailSender', () => {
  it('posts the message to Resend with the key and the fixed sender', async () => {
    const fetchFn = fakeFetch(OK);
    await resendEmailSender(KEY, fetchFn).send(MESSAGE);

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(RESEND_API_URL);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(await new Response(init?.body).text())).toEqual({
      from: EMAIL_FROM,
      to: [MESSAGE.to],
      subject: MESSAGE.subject,
      text: MESSAGE.text,
    });
  });

  it('fails with the status only, never the content', async () => {
    const send = resendEmailSender(KEY, fakeFetch(UNPROCESSABLE)).send(MESSAGE);
    await expect(send).rejects.toThrow(String(UNPROCESSABLE));
    await expect(send).rejects.not.toThrow(MESSAGE.to);
  });
});
