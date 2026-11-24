export const HttpStatus = {
  ok: 200,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  internalError: 500,
} as const;

export const ErrorCode = {
  noSession: 'no_session',
  noActiveTenant: 'no_active_tenant',
  notAMember: 'not_a_member',
  forbidden: 'forbidden',
  authFailure: 'auth_failure',
  invalidRequest: 'invalid_request',
  notFound: 'not_found',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
