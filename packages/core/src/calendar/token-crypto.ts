import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Spec 06: OAuth tokens are encrypted at rest (AES-256-GCM). Stored as `v1.iv.tag.ciphertext`,
// each part base64url. The key (GOOGLE_TOKEN_KEY) is 32 random bytes in base64.

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = 'v1';
const SEPARATOR = '.';
const ENCODING = 'base64url';
const BAD_KEY = 'token key must be 32 bytes in base64';
const BAD_TOKEN = 'unreadable encrypted token';
const PARTS = 4;

function keyBytes(key: string): Buffer {
  const bytes = Buffer.from(key, 'base64');
  if (bytes.length !== KEY_BYTES) throw new Error(BAD_KEY);
  return bytes;
}

export function encryptToken(plain: string, key: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyBytes(key), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const parts = [iv, cipher.getAuthTag(), body].map((part) => part.toString(ENCODING));
  return [VERSION, ...parts].join(SEPARATOR);
}

export function decryptToken(stored: string, key: string): string {
  const parts = stored.split(SEPARATOR);
  const [version, iv, tag, body] = parts;
  if (parts.length !== PARTS || version !== VERSION || !iv || !tag || !body)
    throw new Error(BAD_TOKEN);
  const decipher = createDecipheriv(ALGORITHM, keyBytes(key), Buffer.from(iv, ENCODING));
  decipher.setAuthTag(Buffer.from(tag, ENCODING));
  const plain = Buffer.concat([decipher.update(Buffer.from(body, ENCODING)), decipher.final()]);
  return plain.toString('utf8');
}
