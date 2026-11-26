import type { EmailMessage, EmailSender } from './email-types.ts';

export const RESEND_API_URL = 'https://api.resend.com/emails';
export const EMAIL_FROM = 'Consultório Aberto <nao-responda@consultorioaberto.com.br>';
const RESEND_FAILED = 'Resend rejected the email with status';

type Fetch = typeof fetch;

/** Production email via the Resend HTTP API (E-00f). The error carries the status only, never content. */
export function resendEmailSender(apiKey: string, fetchFn: Fetch = fetch): EmailSender {
  return {
    async send(message: EmailMessage): Promise<void> {
      const response = await fetchFn(RESEND_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
      });
      if (!response.ok) throw new Error(`${RESEND_FAILED} ${String(response.status)}`);
    },
  };
}
