import * as z from 'zod';

export const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed?.length ? trimmed : undefined;
  });

/** Google Calendar (E-21). Without all three the integration is off and the agenda uses our rules. */
export const googleCalendarEnvSchema = z.object({
  GOOGLE_CLIENT_ID: optionalText,
  GOOGLE_CLIENT_SECRET: optionalText,
  /** 32 random bytes in base64 (`openssl rand -base64 32`): encrypts the stored tokens (spec 06). */
  GOOGLE_TOKEN_KEY: optionalText,
});

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  tokenKey: string;
}

export function googleCalendarConfig(
  env: z.infer<typeof googleCalendarEnvSchema>,
): GoogleCalendarConfig | undefined {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = env;
  const tokenKey = env.GOOGLE_TOKEN_KEY;
  return clientId && clientSecret && tokenKey ? { clientId, clientSecret, tokenKey } : undefined;
}
