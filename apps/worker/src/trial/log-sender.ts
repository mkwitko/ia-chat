import type { EmailSender } from '@app/core';

const DEV_EMAIL_LOG = 'email (development only, not sent)';

/** Until the real provider arrives (E-00f): the email is logged, never sent. Same as the API. */
export function logEmailSender(log: (fields: object, message: string) => void): EmailSender {
  return {
    send(message) {
      log({ email: message }, DEV_EMAIL_LOG);
      return Promise.resolve();
    },
  };
}
