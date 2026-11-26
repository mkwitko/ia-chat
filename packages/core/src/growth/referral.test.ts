import { describe, expect, it } from 'vitest';
import {
  REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_PATTERN,
  newReferralCode,
  referralLink,
} from './referral.ts';

describe('referral code', () => {
  it('is short, uppercase and avoids look-alike characters', () => {
    for (let index = 0; index < 200; index += 1) {
      const code = newReferralCode();
      expect(code).toHaveLength(REFERRAL_CODE_LENGTH);
      expect(code).toMatch(REFERRAL_CODE_PATTERN);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('does not repeat in a small sample', () => {
    const codes = new Set(Array.from({ length: 500 }, () => newReferralCode()));
    expect(codes.size).toBe(500);
  });

  it('builds the link on the site origin, with or without a trailing slash', () => {
    expect(referralLink('https://site.exemplo.test', 'ABCD2345')).toBe(
      'https://site.exemplo.test/?ref=ABCD2345',
    );
    expect(referralLink('https://site.exemplo.test/', 'ABCD2345')).toBe(
      'https://site.exemplo.test/?ref=ABCD2345',
    );
  });
});
