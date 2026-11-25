import { aiEnvSchema } from '@app/ai';
import {
  baseEnvSchema,
  billingEnvSchema,
  googleCalendarEnvSchema,
  parseEnvWith,
  whatsappSignupEnvSchema,
} from '@app/core';
import * as z from 'zod';

const MIN_SECRET_LENGTH = 32;
const DEFAULT_PORT = 3000;

const operatorEmails = z
  .string()
  .default('')
  .transform((list) =>
    list
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(z.array(z.email()));

export const apiEnvSchema = baseEnvSchema
  .extend(aiEnvSchema.shape)
  .extend(googleCalendarEnvSchema.shape)
  .extend(billingEnvSchema.shape)
  .extend(whatsappSignupEnvSchema.shape)
  .extend({
    PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
    BETTER_AUTH_SECRET: z.string().min(MIN_SECRET_LENGTH),
    /** Public base URL of this API. */
    BETTER_AUTH_URL: z.url(),
    /** Panel origin, trusted for auth requests. */
    WEB_ORIGIN: z.url(),
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
    /** Platform operators (E-27, H-23): comma-separated emails. Empty means nobody. */
    OPERATOR_EMAILS: operatorEmails,
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function parseApiEnv(source: Record<string, string | undefined>): ApiEnv {
  return parseEnvWith(apiEnvSchema, source);
}
