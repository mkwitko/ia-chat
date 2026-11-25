// One redaction policy for logs and Sentry (RN-38, spec 06): message content, phones, emails,
// cookies and credentials never leave the process. Ids stay (tenantId, jobId, turnId...).

import { isObject, isString } from './guards.ts';

export const REDACTED = '[redacted]';
const TOO_DEEP = '[too deep]';
const MAX_DEPTH = 8;

/** Keys compared lowercase and without `_` or `-`. */
const SENSITIVE_KEYS = new Set([
  'cookie',
  'setcookie',
  'authorization',
  'proxyauthorization',
  'xhubsignature',
  'xhubsignature256',
  'dsn',
  // message and email content
  'text',
  'body',
  'content',
  'caption',
  'html',
  'subject',
  'prompt',
  'reply',
  'transcript',
  'payload',
  'messagetext',
  'emailbody',
  // people
  'phone',
  'phonenumber',
  'waid',
  'msisdn',
  'recipient',
  'email',
  'contactname',
  'displayname',
  'profilename',
]);
const SENSITIVE_SUFFIX = /(token|secret|password|apikey)$/;
const WHITESPACE_RUNS = /(\s+)/;
const AT_SIGN = '@';
// 10 to 15 digits with an optional +; the lookarounds keep UUID groups and ids joined by "-" or
// letters out of it. And the Brazilian "(11) 91234-5678" shape.
const PHONE_DIGITS = /(?<![\w-])\+?\d{10,15}(?![\w-])/g;
const PHONE_BR = /\(\d{2}\) ?9?\d{4}-?\d{4}/g;

const normalize = (key: string) => key.toLowerCase().replaceAll(/[_-]/g, '');
const isSensitiveKey = (key: string) => {
  const name = normalize(key);
  return SENSITIVE_KEYS.has(name) || SENSITIVE_SUFFIX.test(name);
};

// Token-wise on purpose: a regex for emails backtracks badly on long inputs.
const maskEmails = (value: string): string =>
  value
    .split(WHITESPACE_RUNS)
    .map((token) => (token.includes(AT_SIGN) ? REDACTED : token))
    .join('');

export const scrubString = (value: string): string =>
  maskEmails(value).replaceAll(PHONE_DIGITS, REDACTED).replaceAll(PHONE_BR, REDACTED);

function scrubError(error: Error, depth: number): unknown {
  return scrubAt(
    { type: error.name, message: error.message, stack: error.stack, cause: error.cause },
    depth,
  );
}

function scrubObject(value: object, depth: number): unknown {
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? REDACTED : scrubAt(inner, depth + 1);
  }
  return out;
}

function scrubAt(value: unknown, depth: number): unknown {
  if (isString(value)) return scrubString(value);
  if (!isObject(value)) return value;
  if (depth > MAX_DEPTH) return TOO_DEEP;
  if (value instanceof Error) return scrubError(value, depth + 1);
  if (Array.isArray(value)) return value.map((item: unknown) => scrubAt(item, depth + 1));
  if (value instanceof Date) return value;
  return scrubObject(value, depth);
}

/** Deep copy with sensitive keys replaced and phones/emails removed from every string. */
export const scrub = (value: unknown): unknown => scrubAt(value, 0);
