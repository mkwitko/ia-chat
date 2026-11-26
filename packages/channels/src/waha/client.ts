import * as z from 'zod';
import type { ContactRef, SendResult, TemplateRef } from '../types.ts';
import { wahaCaller, WahaError, wahaFetch, type WahaConfig } from './http.ts';
import { LID_PREFIX } from './parse.ts';

const USER_SUFFIX = '@c.us';
const LID_SUFFIX = '@lid';
const ID_SEPARATOR = '_';
const OWN_PREFIX = 'true';
const PLACEHOLDER = /\{\{(\d+)\}\}/g;
const NO_RECIPIENT = 'contact has neither phone nor LID';
const NO_ID = 'waha response without message id';
const NO_BODY = 'template without body: the QR code channel sends it as text';
const FOREIGN_MEDIA = 'media URL outside the WAHA base URL';
const MEDIA_FAILED = 'waha media download failed';
const CONTENT_TYPE = 'content-type';
const OCTET = 'application/octet-stream';
const NON_DIGITS = /\D/g;

export interface WahaClientConfig extends WahaConfig {
  session: string;
}

// nv: GOWS's sendText answer is not in the docs; WEBJS answers `id._serialized`, NOWEB `key.id`
// (then we build the serialized form acks use).
const sentSchema = (chatId: string) =>
  z.union([
    z.object({ id: z.string().min(1) }).transform((sent) => sent.id),
    z
      .object({ id: z.object({ _serialized: z.string().min(1) }) })
      .transform((sent) => sent.id._serialized),
    z
      .object({ key: z.object({ id: z.string().min(1) }) })
      .transform((sent) => [OWN_PREFIX, chatId, sent.key.id].join(ID_SEPARATOR)),
  ]);

export type WahaClient = ReturnType<typeof createWahaClient>;

export function createWahaClient(config: WahaClientConfig) {
  const call = wahaCaller(config);
  const { session } = config;
  const sendText = async (to: ContactRef, text: string, opts: { replyTo?: string } = {}) => {
    const chatId = chatIdOf(to);
    const body = { session, chatId, text, ...(opts.replyTo ? { reply_to: opts.replyTo } : {}) };
    return sentId(chatId, await call('/api/sendText', body));
  };
  return {
    sendText,
    /** No templates here: the approved text goes as a plain message (RF-28 allows it). */
    sendTemplate: (to: ContactRef, template: TemplateRef, vars: readonly string[]) =>
      sendText(to, renderTemplate(template, vars)),
    /** "Seen", then "typing…" (WAHA's advice against blocking). */
    async markReadAndTyping(providerMessageId: string): Promise<void> {
      const chatId = providerMessageId.split(ID_SEPARATOR)[1] ?? '';
      await call('/api/sendSeen', { session, chatId, messageIds: [providerMessageId] });
      await call('/api/startTyping', { session, chatId });
    },
    downloadMedia: (url: string) => downloadMedia(config, url),
  };
}

export function chatIdOf(to: ContactRef): string {
  const digits = to.phoneE164?.replace(NON_DIGITS, '');
  if (digits) return `${digits}${USER_SUFFIX}`;
  if (to.bsuid?.startsWith(LID_PREFIX)) return `${to.bsuid.slice(LID_PREFIX.length)}${LID_SUFFIX}`;
  throw new WahaError(0, NO_RECIPIENT);
}

export function renderTemplate(template: TemplateRef, vars: readonly string[]): string {
  if (!template.body) throw new WahaError(0, NO_BODY);
  return template.body.replace(
    PLACEHOLDER,
    (_match, index: string) => vars[Number(index) - 1] ?? '',
  );
}

function sentId(chatId: string, payload: unknown): SendResult {
  const parsed = sentSchema(chatId).safeParse(payload);
  if (!parsed.success) throw new WahaError(0, NO_ID);
  return { providerMessageId: parsed.data };
}

/** Only files WAHA itself serves: the URL came in a webhook and must not point elsewhere. */
async function downloadMedia(config: WahaConfig, url: string) {
  if (!url.startsWith(`${config.baseUrl}/`)) throw new WahaError(0, FOREIGN_MEDIA);
  const response = await wahaFetch(config, url.slice(config.baseUrl.length));
  if (!response.ok) throw new WahaError(response.status, MEDIA_FAILED);
  const mime = response.headers.get(CONTENT_TYPE) ?? OCTET;
  return { bytes: Buffer.from(await response.arrayBuffer()), mime };
}
