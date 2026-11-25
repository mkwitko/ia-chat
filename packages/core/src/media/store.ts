import * as z from 'zod';
import { optionalText } from '../env.ts';
import { encodeRfc3986, presignUrl, type Credentials } from './sigv4.ts';

// Media in Cloudflare R2 (spec 02 and 03, RF-24): keys start with the tenant id (RN-05),
// reads go through short-lived signed URLs, writes are signed requests from the worker.

const REGION = 'auto';
const PUT = 'PUT';
const GET = 'GET';
const WRITE_EXPIRES_SECONDS = 300;
export const READ_EXPIRES_SECONDS = 300;
const FAILED = 'media upload failed';

export const r2EnvSchema = z.object({
  R2_ACCOUNT_ID: optionalText,
  R2_ACCESS_KEY_ID: optionalText,
  R2_SECRET_ACCESS_KEY: optionalText,
  /** Defaults to the account's R2 endpoint. */
  R2_ENDPOINT: optionalText,
  R2_MEDIA_BUCKET: optionalText,
});

export interface R2Config extends Credentials {
  endpoint: string;
  bucket: string;
}

/** Undefined while any piece is missing: media stays off instead of failing at runtime. */
export function r2Config(env: Partial<z.output<typeof r2EnvSchema>>): R2Config | undefined {
  const { R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey } = env;
  const bucket = env.R2_MEDIA_BUCKET;
  const endpoint =
    env.R2_ENDPOINT ??
    (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) return undefined;
  return { accessKeyId, secretAccessKey, bucket, endpoint, region: REGION };
}

const EXTENSIONS: Readonly<Record<string, string>> = {
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const NO_EXTENSION = 'bin';
const MIME_PARAMS = ';';

/** `tenants/<tenantId>/media/<messageId>.<ext>`: RN-05, nothing outside the tenant's prefix. */
export function mediaKey(input: { tenantId: string; messageId: string; mime: string }): string {
  const extension = EXTENSIONS[(input.mime.split(MIME_PARAMS)[0] ?? '').trim()] ?? NO_EXTENSION;
  return `tenants/${input.tenantId}/media/${input.messageId}.${extension}`;
}

export interface MediaStore {
  put: (key: string, body: { bytes: Uint8Array; mime: string }) => Promise<void>;
  /** A URL the panel can open for a few minutes. */
  signedUrl: (key: string) => string;
}

export function createMediaStore(
  config: R2Config,
  deps: { fetch?: typeof fetch; now?: () => Date } = {},
): MediaStore {
  const { host } = new URL(config.endpoint);
  const sign = (method: string, key: string, expiresSeconds: number) =>
    presignUrl(config, {
      method,
      host,
      path: `/${config.bucket}/${key.split('/').map(encodeRfc3986).join('/')}`,
      expiresSeconds,
      now: deps.now?.() ?? new Date(),
    });
  return {
    async put(key, { bytes, mime }) {
      const response = await (deps.fetch ?? fetch)(sign(PUT, key, WRITE_EXPIRES_SECONDS), {
        method: PUT,
        headers: { 'content-type': mime },
        body: new Uint8Array(bytes),
      });
      if (!response.ok) throw new Error(`${FAILED} (${String(response.status)})`);
    },
    signedUrl: (key) => sign(GET, key, READ_EXPIRES_SECONDS),
  };
}
