import { NodeEnv, type Env } from '../env.ts';

/**
 * The Resend key to send with, or undefined to log the email instead. Outside production nothing
 * real is sent, even with a key, unless `EMAIL_SEND_IN_DEV=true`.
 */
export function resendKeyFor(
  env: Pick<Env, 'NODE_ENV' | 'RESEND_API_KEY' | 'EMAIL_SEND_IN_DEV'>,
): string | undefined {
  if (env.NODE_ENV === NodeEnv.production || env.EMAIL_SEND_IN_DEV) return env.RESEND_API_KEY;
  return undefined;
}
