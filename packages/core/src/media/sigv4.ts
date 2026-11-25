import { createHash, createHmac } from 'node:crypto';

// AWS Signature V4 for a query-signed (presigned) request. Enough for R2 (S3-compatible):
// one signed header (host), unsigned payload. Verified against AWS's published example.

const ALGORITHM = 'AWS4-HMAC-SHA256';
const SERVICE = 's3';
const TERMINATOR = 'aws4_request';
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';
const SIGNED_HEADERS = 'host';
const ISO_STRIP = /[:-]|\.\d{3}/g;
const ENCODE_EXTRA = /[!'()*]/g;
const HEX = 16;
const DAY_LENGTH = 8;

export interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface PresignRequest {
  method: string;
  host: string;
  /** Absolute path, already URI-encoded per segment. */
  path: string;
  expiresSeconds: number;
  now: Date;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const hmac = (key: Buffer | string, value: string) =>
  createHmac('sha256', key).update(value).digest();

/** RFC 3986 encoding, as SigV4 requires. */
export const encodeRfc3986 = (value: string) =>
  encodeURIComponent(value).replace(
    ENCODE_EXTRA,
    (char) => `%${(char.codePointAt(0) ?? 0).toString(HEX).toUpperCase()}`,
  );

function amzDate(now: Date): string {
  return now.toISOString().replace(ISO_STRIP, '');
}

function signingKey({ secretAccessKey, region }: Credentials, day: string): Buffer {
  const dated = hmac(`AWS4${secretAccessKey}`, day);
  return hmac(hmac(hmac(dated, region), SERVICE), TERMINATOR);
}

/** The full URL, query included, valid for `expiresSeconds`. */
export function presignUrl(credentials: Credentials, request: PresignRequest): string {
  const stamp = amzDate(request.now);
  const day = stamp.slice(0, DAY_LENGTH);
  const scope = [day, credentials.region, SERVICE, TERMINATOR].join('/');
  const query: [string, string][] = [
    ['X-Amz-Algorithm', ALGORITHM],
    ['X-Amz-Credential', `${credentials.accessKeyId}/${scope}`],
    ['X-Amz-Date', stamp],
    ['X-Amz-Expires', String(request.expiresSeconds)],
    ['X-Amz-SignedHeaders', SIGNED_HEADERS],
  ];
  const canonicalQuery = query
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .sort((a, b) => (a < b ? -1 : Number(a > b)))
    .join('&');
  const canonical = [
    request.method,
    request.path,
    canonicalQuery,
    `host:${request.host}\n`,
    SIGNED_HEADERS,
    UNSIGNED_PAYLOAD,
  ].join('\n');
  const toSign = [ALGORITHM, stamp, scope, sha256(canonical)].join('\n');
  const signature = hmac(signingKey(credentials, day), toSign).toString('hex');
  return `https://${request.host}${request.path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
