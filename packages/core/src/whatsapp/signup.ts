import * as z from 'zod';
import { optionalText } from '../calendar/env.ts';
import { decryptToken } from '../calendar/token-crypto.ts';
import { MessageTemplates, type MessageTemplate } from '../reminders/templates.ts';

/** Embedded Signup (E-24, spec 03). Without all of these the "Conectar WhatsApp" button is off. */
export const whatsappSignupEnvSchema = z.object({
  /** Public: the panel loads it into the Facebook SDK. */
  META_APP_ID: optionalText,
  /** Public: the Embedded Signup configuration (Facebook Login for Business). */
  META_ES_CONFIG_ID: optionalText,
  /** 32 random bytes in base64: encrypts each client's Meta token (same scheme as Google's). */
  META_TOKEN_KEY: optionalText,
});

export interface WhatsappSignupConfig {
  appId: string;
  appSecret: string;
  configId: string;
  tokenKey: string;
}

export function whatsappSignupConfig(
  env: z.infer<typeof whatsappSignupEnvSchema> & { META_APP_SECRET?: string | undefined },
): WhatsappSignupConfig | undefined {
  const { META_APP_ID: appId, META_APP_SECRET: appSecret } = env;
  const { META_ES_CONFIG_ID: configId, META_TOKEN_KEY: tokenKey } = env;
  return appId && appSecret && configId && tokenKey
    ? { appId, appSecret, configId, tokenKey }
    : undefined;
}

/** Reads a channel's stored token; undefined without the key (the global token is used then). */
export function channelTokenReader(
  tokenKey: string | undefined,
): ((stored: string) => string) | undefined {
  return tokenKey ? (stored) => decryptToken(stored, tokenKey) : undefined;
}

/** Fictional values Meta shows the reviewer, in the order of {{1}}..{{4}}. */
export const TEMPLATE_EXAMPLE = ['Consulta', '10/12/2026', '14:30', 'Rua das Flores, 100'] as const;

/** Templates created in each client's WABA: only those ever sent outside the 24 h window. */
export const SIGNUP_TEMPLATES: readonly MessageTemplate[] = [
  MessageTemplates.confirmation,
  MessageTemplates.reminder,
];
