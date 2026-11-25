export const HttpStatus = {
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  tooManyRequests: 429,
  internalError: 500,
  badGateway: 502,
  unavailable: 503,
} as const;

export const ErrorCode = {
  noSession: 'no_session',
  noActiveTenant: 'no_active_tenant',
  notAMember: 'not_a_member',
  forbidden: 'forbidden',
  authFailure: 'auth_failure',
  invalidRequest: 'invalid_request',
  notFound: 'not_found',
  staleDraft: 'stale_draft',
  sendFailed: 'send_failed',
  rateLimited: 'rate_limited',
  simulatorOff: 'simulator_off',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
