import { createHmac, timingSafeEqual } from 'node:crypto';

export const WAHA_HMAC_HEADER = 'x-webhook-hmac';
const ALGORITHM = 'sha512';
const HEX = /^[0-9a-f]{128}$/;

/** WAHA signs each webhook body with HMAC-SHA512 (`X-Webhook-Hmac`, hex) when a key is set. */
export function verifyWahaSignature(
  rawBody: Buffer,
  header: string | undefined,
  secret: string,
): boolean {
  if (!header || !HEX.test(header)) return false;
  const expected = createHmac(ALGORITHM, secret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(header, 'hex'));
}

/** Test seam and fixture helper: what WAHA puts in the header. */
export function signWahaBody(rawBody: Buffer, secret: string): string {
  return createHmac(ALGORITHM, secret).update(rawBody).digest('hex');
}
