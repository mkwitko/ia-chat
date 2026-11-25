import { AccountCopy, InviteCopy, SignUpCopy } from './account-copy';

// Better Auth error codes with their own message; anything else gets the generic one.
const MESSAGES: Readonly<Record<string, string>> = {
  USER_ALREADY_EXISTS: SignUpCopy.exists,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: SignUpCopy.exists,
  PASSWORD_TOO_SHORT: SignUpCopy.shortPassword,
  INVITE_REQUIRED: InviteCopy.required,
};

export function authErrorMessage(code: string | undefined): string {
  if (!navigator.onLine) return AccountCopy.offline;
  return (code && MESSAGES[code]) ?? AccountCopy.generic;
}

/** Absolute URL of a panel route, for links sent by email. */
export const panelUrl = (path: string) => new URL(path, window.location.origin).toString();
