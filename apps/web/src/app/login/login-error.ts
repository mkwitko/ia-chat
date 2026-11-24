import { LoginCopy } from '@/copy';

// Better Auth error codes that have their own message; anything else gets the generic one.
const ErrorCode = {
  invalid: 'INVALID_EMAIL_OR_PASSWORD',
  unverified: 'EMAIL_NOT_VERIFIED',
} as const;

const MESSAGES: Readonly<Record<string, string>> = {
  [ErrorCode.invalid]: LoginCopy.invalid,
  [ErrorCode.unverified]: LoginCopy.unverified,
};

export function loginErrorMessage(code: string | undefined): string {
  if (!navigator.onLine) return LoginCopy.offline;
  return (code && MESSAGES[code]) ?? LoginCopy.generic;
}
