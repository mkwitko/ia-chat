import { randomInt } from 'node:crypto';

// M-11 (spec 11, "Modelo de indicação"): each subscribing business has a short code and a link
// to share by its own means. The code only attributes a sign-up; nothing here sends a message.

/** No 0, 1, O, I or L: the code is read aloud and typed by hand. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{8}$/;
/** Where the link points when SITE_ORIGIN is not configured. */
export const REFERRAL_DEFAULT_SITE = 'https://consultorioaberto.com.br';
export const REFERRAL_QUERY = 'ref';

export function newReferralCode(): string {
  let code = '';
  for (let index = 0; index < REFERRAL_CODE_LENGTH; index += 1)
    code += ALPHABET.charAt(randomInt(ALPHABET.length));
  return code;
}

export function referralLink(siteOrigin: string, code: string): string {
  const url = new URL(siteOrigin);
  url.pathname = '/';
  url.search = new URLSearchParams({ [REFERRAL_QUERY]: code }).toString();
  return url.toString();
}
