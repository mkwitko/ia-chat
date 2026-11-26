import { describe, expect, it } from 'vitest';
import { NodeEnv } from '../env.ts';
import { resendKeyFor } from './email-mode.ts';

const KEY = 're_test_fake_key';

describe('resendKeyFor', () => {
  it('sends for real in production', () => {
    const env = { NODE_ENV: NodeEnv.production, RESEND_API_KEY: KEY, EMAIL_SEND_IN_DEV: false };
    expect(resendKeyFor(env)).toBe(KEY);
  });

  it('only logs in development and test, even with a key', () => {
    for (const NODE_ENV of [NodeEnv.development, NodeEnv.test]) {
      expect(
        resendKeyFor({ NODE_ENV, RESEND_API_KEY: KEY, EMAIL_SEND_IN_DEV: false }),
      ).toBeUndefined();
    }
  });

  it('sends in development when EMAIL_SEND_IN_DEV is on', () => {
    const env = { NODE_ENV: NodeEnv.development, RESEND_API_KEY: KEY, EMAIL_SEND_IN_DEV: true };
    expect(resendKeyFor(env)).toBe(KEY);
  });
});
