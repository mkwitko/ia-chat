import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature } from './signature.ts';

const SECRET = 'app-secret-de-teste';
const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
const sign = (bytes: Buffer, secret = SECRET) =>
  `sha256=${createHmac('sha256', secret).update(bytes).digest('hex')}`;

describe('Cloud API webhook signature (RF-20)', () => {
  it('accepts the HMAC-SHA256 of the raw body', () => {
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a body changed after signing, even by one byte', () => {
    const changed = Buffer.from(body.toString().replace('[]', '[ ]'));
    expect(verifySignature(changed, sign(body), SECRET)).toBe(false);
  });

  it('rejects another secret, a missing header and a malformed header', () => {
    expect(verifySignature(body, sign(body, 'outro-segredo'), SECRET)).toBe(false);
    expect(verifySignature(body, undefined, SECRET)).toBe(false);
    expect(verifySignature(body, 'sha1=abc', SECRET)).toBe(false);
    expect(verifySignature(body, 'sha256=zz', SECRET)).toBe(false);
  });
});
