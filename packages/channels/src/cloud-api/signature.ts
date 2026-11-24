import { createHmac, timingSafeEqual } from 'node:crypto';

const PREFIX = 'sha256=';
const HEX = /^[0-9a-f]{64}$/;
const ALGORITHM = 'sha256';

/** RF-20: X-Hub-Signature-256 is the HMAC-SHA256 of the raw body, keyed by the app secret. */
export function verifySignature(
  rawBody: Buffer,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!header?.startsWith(PREFIX)) return false;
  const received = header.slice(PREFIX.length);
  if (!HEX.test(received)) return false;
  const expected = createHmac(ALGORITHM, appSecret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(received, 'hex'));
}
