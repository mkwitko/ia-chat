import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// OAuth `state` (CSRF protection): binds the consent to one tenant and one user, expires in ten
// minutes and is signed with the server secret. Format: payload.signature, both base64url.

const STATE_TTL_MS = 600_000;
const NONCE_BYTES = 8;
const SEPARATOR = '.';
const FIELD_SEPARATOR = '|';
const ENCODING = 'base64url';
const ALGORITHM = 'sha256';

export interface OAuthState {
  tenantId: string;
  userId: string;
}

const sign = (payload: string, secret: string) =>
  createHmac(ALGORITHM, secret).update(payload).digest(ENCODING);

export function signState(input: OAuthState & { secret: string; now: Date }): string {
  const expires = String(input.now.getTime() + STATE_TTL_MS);
  const nonce = randomBytes(NONCE_BYTES).toString(ENCODING);
  const payload = Buffer.from(
    [input.tenantId, input.userId, expires, nonce].join(FIELD_SEPARATOR),
  ).toString(ENCODING);
  return `${payload}${SEPARATOR}${sign(payload, input.secret)}`;
}

/** The tenant and user the state was issued for, or null if forged, tampered or expired. */
export function verifyState(input: {
  state: string;
  secret: string;
  now: Date;
}): OAuthState | null {
  const [payload, signature] = input.state.split(SEPARATOR);
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, input.secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const [tenantId, userId, expires] = Buffer.from(payload, ENCODING)
    .toString()
    .split(FIELD_SEPARATOR);
  if (!tenantId || !userId || Number(expires) < input.now.getTime()) return null;
  return { tenantId, userId };
}
