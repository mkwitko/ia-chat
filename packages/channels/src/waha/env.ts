import * as z from 'zod';
import type { WahaConfig } from './http.ts';

/** An empty line in .env (`WAHA_URL=`) means "not set". */
const optional = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed?.length ? trimmed : undefined;
  });

/** E-09b: the WAHA gateway. Without URL and key the QR code connection is off. */
export const wahaEnvSchema = z.object({
  /** Private network address of the container, e.g. http://waha:3000. Never public. */
  WAHA_URL: optional.pipe(z.url().optional()),
  /** Plain API key; the container gets the same value (WAHA_API_KEY). */
  WAHA_API_KEY: optional,
  /** HMAC-SHA512 key of the webhooks (WHATSAPP_HOOK_HMAC_KEY in the container). */
  WAHA_WEBHOOK_SECRET: optional,
});

const TRAILING_SLASH = /\/$/;

export type WahaEnv = z.infer<typeof wahaEnvSchema>;

/** Parsed env (the API's) or the raw process env (the worker's). */
export function wahaConfig(
  source: WahaEnv | Record<string, string | undefined>,
): WahaConfig | undefined {
  const env = wahaEnvSchema.parse(source);
  if (!env.WAHA_URL || !env.WAHA_API_KEY) return undefined;
  return { baseUrl: env.WAHA_URL.replace(TRAILING_SLASH, ''), apiKey: env.WAHA_API_KEY };
}
