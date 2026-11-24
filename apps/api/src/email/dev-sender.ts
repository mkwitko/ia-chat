import type { FastifyBaseLogger } from 'fastify';
import type { EmailMessage, EmailSender } from './outbox.ts';

const DEV_EMAIL_LOG = 'email (development only, not sent)';

/** Development: prints emails to the log so links can be followed. Never in production. */
export function devEmailSender(log: FastifyBaseLogger): EmailSender {
  return {
    send(message: EmailMessage): Promise<void> {
      log.info({ email: message }, DEV_EMAIL_LOG);
      return Promise.resolve();
    },
  };
}
