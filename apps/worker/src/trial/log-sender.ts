import { NodeEnv, resendEmailSender, type EmailSender, type Env } from '@app/core';

const DEV_EMAIL_LOG = 'email (development only, not sent)';

/** Development: the email is logged, never sent. Same as the API. */
export function logEmailSender(log: (fields: object, message: string) => void): EmailSender {
  return {
    send(message) {
      log({ email: message }, DEV_EMAIL_LOG);
      return Promise.resolve();
    },
  };
}

const NO_EMAIL_PROVIDER = 'RESEND_API_KEY is required in production.';

/** Resend when the key is set; the log in development; production without a key refuses to start. */
export function workerEmailSender(
  env: Pick<Env, 'NODE_ENV' | 'RESEND_API_KEY'>,
  log: (fields: object, message: string) => void,
): EmailSender {
  if (env.RESEND_API_KEY) return resendEmailSender(env.RESEND_API_KEY);
  if (env.NODE_ENV === NodeEnv.production) throw new Error(NO_EMAIL_PROVIDER);
  return logEmailSender(log);
}
