import { aiEnvSchema } from '@app/ai';
import { baseEnvSchema, parseEnvWith } from '@app/core';
import * as z from 'zod';

const MIN_SECRET_LENGTH = 32;
const DEFAULT_PORT = 3000;

export const apiEnvSchema = baseEnvSchema.extend(aiEnvSchema.shape).extend({
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  BETTER_AUTH_SECRET: z.string().min(MIN_SECRET_LENGTH),
  /** Public base URL of this API. */
  BETTER_AUTH_URL: z.url(),
  /** Panel origin, trusted for auth requests. */
  WEB_ORIGIN: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  /** Meta app secret: signs every WhatsApp webhook (RF-20). Without it the webhook is off. */
  META_APP_SECRET: z.string().min(1).optional(),
  /** Token we choose and type in the Meta app to confirm the webhook URL. */
  META_VERIFY_TOKEN: z.string().min(1).optional(),
  /** System-user token that sends messages. Empty in development: the panel only records. */
  META_ACCESS_TOKEN: z.string().min(1).optional(),
  /** Web Push public key (VAPID), handed to the panel so the browser can subscribe (E-16). */
  PUSH_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  /** Public site origin (S-01): the only origin allowed to call the waitlist route. */
  SITE_ORIGIN: z.url().optional(),
  /** Cloudflare Turnstile secret key (S-01). Without it and SITE_ORIGIN the waitlist route is off. */
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function parseApiEnv(source: Record<string, string | undefined>): ApiEnv {
  return parseEnvWith(apiEnvSchema, source);
}
