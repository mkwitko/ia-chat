import { NodeEnv, resendEmailSender, resendKeyFor, type EmailSender, type Env } from '@app/core';

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

/** Resend in production (EMAIL_SEND_IN_DEV opts development in); the log otherwise. */
export function workerEmailSender(
  env: Pick<Env, 'NODE_ENV' | 'RESEND_API_KEY' | 'EMAIL_SEND_IN_DEV'>,
  log: (fields: object, message: string) => void,
): EmailSender {
  const key = resendKeyFor(env);
  if (key) return resendEmailSender(key);
  if (env.NODE_ENV === NodeEnv.production) throw new Error(NO_EMAIL_PROVIDER);
  return logEmailSender(log);
}
