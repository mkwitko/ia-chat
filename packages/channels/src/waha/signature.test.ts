import { describe, expect, it } from 'vitest';
import { signWahaBody, verifyWahaSignature } from './signature.ts';

const SECRET = 'my-secret-key';
// The worked example from the WAHA docs ("Events" > "HMAC authentication").
const DOC_BODY = Buffer.from('{"event":"message","session":"default","engine":"WEBJS"}');
const DOC_HMAC =
  '208f8a55dde9e05519e898b10b89bf0d0b3b0fdf11fdbf09b6b90476301b98d8097c462b2b17a6ce93b6b47a136cf2e78a33a63f6752c2c1631777076153fa89';

describe('WAHA webhook signature', () => {
  it('matches the example in the WAHA docs', () => {
    expect(signWahaBody(DOC_BODY, SECRET)).toBe(DOC_HMAC);
    expect(verifyWahaSignature(DOC_BODY, DOC_HMAC, SECRET)).toBe(true);
  });

  it('rejects a changed body, another key, a missing or malformed header', () => {
    const changed = Buffer.from(DOC_BODY.toString().replace('WEBJS', 'GOWS'));
    expect(verifyWahaSignature(changed, DOC_HMAC, SECRET)).toBe(false);
    expect(verifyWahaSignature(DOC_BODY, DOC_HMAC, 'outra-chave')).toBe(false);
    expect(verifyWahaSignature(DOC_BODY, undefined, SECRET)).toBe(false);
    expect(verifyWahaSignature(DOC_BODY, 'zz', SECRET)).toBe(false);
  });
});
