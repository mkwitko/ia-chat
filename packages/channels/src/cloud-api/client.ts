import type { ContactRef, SendResult, TemplateRef } from '../types.ts';

// Graph API calls for one phone number (research 01, verified 24/11/2026). v27.0 is the
// version in Meta's current examples.
export const GRAPH_VERSION = 'v27.0';
const GRAPH_ORIGIN = 'https://graph.facebook.com';
const PRODUCT = 'whatsapp';
const READ = 'read';
const TYPING = 'text';
const POST = 'POST';
const JSON_TYPE = 'application/json';

export class CloudApiError extends Error {
  readonly code: string | undefined;
  readonly status: number;
  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface CloudClientConfig {
  phoneNumberId: string;
  accessToken: string;
  fetch?: typeof fetch;
}

export type CloudClient = ReturnType<typeof createCloudClient>;

export function createCloudClient(config: CloudClientConfig) {
  const call = graphCaller(config);
  const messages = `${config.phoneNumberId}/messages`;
  return {
    async sendText(
      to: ContactRef,
      text: string,
      opts: { replyTo?: string } = {},
    ): Promise<SendResult> {
      const body = {
        ...recipient(to),
        type: 'text',
        text: { body: text, preview_url: false },
        ...(opts.replyTo ? { context: { message_id: opts.replyTo } } : {}),
      };
      return sent(await call(messages, body));
    },
    async sendTemplate(
      to: ContactRef,
      template: TemplateRef,
      vars: readonly string[],
    ): Promise<SendResult> {
      const body = { ...recipient(to), type: 'template', template: templateBody(template, vars) };
      return sent(await call(messages, body));
    },
    /** Marks the message read and shows "typing…" for up to 25 s (spec 03, step 1 of a turn). */
    async markReadAndTyping(providerMessageId: string): Promise<void> {
      await call(messages, {
        messaging_product: PRODUCT,
        status: READ,
        message_id: providerMessageId,
        typing_indicator: { type: TYPING },
      });
    },
    downloadMedia: (mediaId: string) => downloadMedia(config, call, mediaId),
  };
}

/** Media URLs expire in 5 minutes (spec 03): resolve and download in one go. */
async function downloadMedia(
  config: CloudClientConfig,
  call: GraphCall,
  mediaId: string,
): Promise<{ bytes: Buffer; mime: string }> {
  const info = (await call(mediaId)) as { url: string; mime_type: string };
  const response = await (config.fetch ?? fetch)(info.url, { headers: auth(config) });
  if (!response.ok) throw new CloudApiError(response.status, undefined, 'media download failed');
  return { bytes: Buffer.from(await response.arrayBuffer()), mime: info.mime_type };
}

type GraphCall = (path: string, body?: object) => Promise<unknown>;

function templateBody(template: TemplateRef, vars: readonly string[]) {
  const parameters = vars.map((value) => ({ type: 'text', text: value }));
  const components = parameters.length ? [{ type: 'body', parameters }] : [];
  return { name: template.name, language: { code: template.language }, components };
}

function graphCaller(config: CloudClientConfig): GraphCall {
  return async (path: string, body?: object): Promise<unknown> => {
    const init: RequestInit = body
      ? {
          method: POST,
          headers: { ...auth(config), 'content-type': JSON_TYPE },
          body: JSON.stringify(body),
        }
      : { headers: auth(config) };
    const response = await (config.fetch ?? fetch)(
      `${GRAPH_ORIGIN}/${GRAPH_VERSION}/${path}`,
      init,
    );
    const payload = (await response.json()) as { error?: { code?: number; message?: string } };
    if (!response.ok) {
      throw new CloudApiError(
        response.status,
        payload.error?.code?.toString(),
        payload.error?.message ?? 'graph request failed',
      );
    }
    return payload;
  };
}

// nv: sending to a BSUID when the patient hides the phone (research 01) is not confirmed;
// phone first, BSUID otherwise. Check with the Meta test number.
function recipient(to: ContactRef): Record<string, string> {
  const id = to.phoneE164?.replace('+', '') ?? to.bsuid;
  if (!id) throw new CloudApiError(0, undefined, 'contact has neither phone nor BSUID');
  return { messaging_product: PRODUCT, recipient_type: 'individual', to: id };
}

function sent(payload: unknown): SendResult {
  const id = (payload as { messages?: { id?: string }[] }).messages?.[0]?.id;
  if (!id) throw new CloudApiError(0, undefined, 'graph response without message id');
  return { providerMessageId: id };
}

function auth(config: CloudClientConfig): Record<string, string> {
  return { authorization: `Bearer ${config.accessToken}` };
}
