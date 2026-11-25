import { isObject, isString } from './guards.ts';

// Fastify logs the raw request and reply; only the request line and the status are kept, so
// headers, bodies and query strings (which may carry tokens) never reach a log line.

const QUERY = '?';

const read = (value: unknown, key: string): unknown =>
  isObject(value) && key in value ? (value as Record<string, unknown>)[key] : undefined;

function requestLine(req: unknown) {
  const method = read(req, 'method');
  const url = read(req, 'url');
  return {
    method: isString(method) ? method : undefined,
    path: isString(url) ? url.split(QUERY)[0] : undefined,
  };
}

/** Replaces `req`/`res` with their safe summary; other fields are left as they are. */
export function withHttpLine(fields: Record<string, unknown>): Record<string, unknown> {
  const { req, res, ...rest } = fields;
  return {
    ...rest,
    ...(req === undefined ? {} : { req: requestLine(req) }),
    ...(res === undefined ? {} : { res: { statusCode: read(res, 'statusCode') } }),
  };
}
