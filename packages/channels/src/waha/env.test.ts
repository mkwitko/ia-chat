import { describe, expect, it } from 'vitest';
import { WAHA_BASE_URL } from '../fixtures/waha-webhooks.ts';
import { wahaConfig } from './env.ts';

describe('WAHA env', () => {
  it('is off with empty lines and on with URL and key', () => {
    expect(wahaConfig({ WAHA_URL: '', WAHA_API_KEY: '' })).toBeUndefined();
    expect(wahaConfig({ WAHA_URL: `${WAHA_BASE_URL}/`, WAHA_API_KEY: 'k' })).toEqual({
      baseUrl: WAHA_BASE_URL,
      apiKey: 'k',
    });
    expect(() => wahaConfig({ WAHA_URL: 'not a url', WAHA_API_KEY: 'k' })).toThrow();
  });
});
