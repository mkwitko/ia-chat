import * as z from 'zod';
import { graphCaller, type GraphCall } from './client.ts';

// Embedded Signup as a Tech Provider (E-24, Meta docs read 25/11/2026): exchange the code for the
// client's business token, then act on the client's WABA with that token.

const PRODUCT = 'whatsapp';
const CATEGORY = 'utility';
const PARAMETER_FORMAT = 'positional';
const BODY = 'body';
// ponytail: one page of templates; a fresh WABA has a handful. Follow `paging.next` if it grows.
const TEMPLATE_PAGE = 200;
const KEY_SEPARATOR = ':';

const tokenSchema = z.object({ access_token: z.string().min(1) });
const phonesSchema = z.object({
  data: z.array(z.object({ id: z.string(), display_phone_number: z.string().optional() })),
});
const fundingSchema = z.object({ primary_funding_id: z.string().optional() });
const templatesSchema = z.object({
  data: z.array(z.object({ name: z.string(), language: z.string() })),
});

export interface SignupTemplate {
  name: string;
  language: string;
  /** Body with positional {{1}}..{{n}}. */
  body: string;
  /** One example per variable, for Meta's review. */
  example: readonly string[];
}

export interface CodeExchange {
  appId: string;
  appSecret: string;
  code: string;
  fetch?: typeof fetch | undefined;
}

/** Server to server; the code lives 5 minutes. */
export async function exchangeSignupCode(input: CodeExchange): Promise<string> {
  const query = new URLSearchParams({
    client_id: input.appId,
    client_secret: input.appSecret,
    code: input.code,
  });
  const call = graphCaller({ accessToken: '', fetch: input.fetch });
  return tokenSchema.parse(await call(`oauth/access_token?${query.toString()}`)).access_token;
}

/** Meta's `smb_app_data` sync types: each can be requested once per onboarding, within 24 h. */
export const AppDataSync = { contacts: 'smb_app_state_sync', history: 'history' } as const;
export type AppDataSync = (typeof AppDataSync)[keyof typeof AppDataSync];

export const templateKey = (name: string, language: string) => `${name}${KEY_SEPARATOR}${language}`;

export type BusinessClient = ReturnType<typeof createBusinessClient>;

export function createBusinessClient(config: {
  accessToken: string;
  fetch?: typeof fetch | undefined;
}) {
  const call = graphCaller(config);
  return {
    async phoneNumbers(wabaId: string) {
      const fields = 'fields=id,display_phone_number';
      return phonesSchema.parse(await call(`${wabaId}/phone_numbers?${fields}`)).data;
    },
    /** Webhooks of this WABA come to our app. Idempotent at Meta. */
    async subscribeApp(wabaId: string): Promise<void> {
      await call(`${wabaId}/subscribed_apps`, {});
    },
    /** Not for coexistence numbers: they are already registered by the Business app. */
    async register(phoneNumberId: string, pin: string): Promise<void> {
      await call(`${phoneNumberId}/register`, { messaging_product: PRODUCT, pin });
    },
    /**
     * Spec 03 step 3: the client pays Meta with their own card. nv: `primary_funding_id` on the
     * WABA node is our reading of the Graph reference; confirm with the first real client.
     */
    async hasPaymentMethod(wabaId: string): Promise<boolean> {
      const { primary_funding_id: funding } = fundingSchema.parse(
        await call(`${wabaId}?fields=primary_funding_id`),
      );
      return Boolean(funding);
    },
    /** Coexistence (E-24b): asks Meta to send the phone book or the history as webhooks. */
    async requestAppData(phoneNumberId: string, syncType: AppDataSync): Promise<void> {
      await call(`${phoneNumberId}/smb_app_data`, {
        messaging_product: PRODUCT,
        sync_type: syncType,
      });
    },
    async templateKeys(wabaId: string): Promise<Set<string>> {
      const path = `${wabaId}/message_templates?fields=name,language&limit=${String(TEMPLATE_PAGE)}`;
      const { data } = templatesSchema.parse(await call(path));
      return new Set(data.map((one) => templateKey(one.name, one.language)));
    },
    createTemplate: (wabaId: string, template: SignupTemplate) =>
      createTemplate(call, wabaId, template),
  };
}

async function createTemplate(
  call: GraphCall,
  wabaId: string,
  template: SignupTemplate,
): Promise<void> {
  await call(`${wabaId}/message_templates`, {
    name: template.name,
    language: template.language,
    category: CATEGORY,
    parameter_format: PARAMETER_FORMAT,
    components: [
      { type: BODY, text: template.body, example: { body_text: [[...template.example]] } },
    ],
  });
}
