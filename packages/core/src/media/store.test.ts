import { describe, expect, it, vi } from 'vitest';
import { createMediaStore, mediaKey, r2Config } from './store.ts';

const CONFIG = {
  accessKeyId: 'id',
  secretAccessKey: 'secret',
  bucket: 'media',
  endpoint: 'https://acct.r2.cloudflarestorage.com',
  region: 'auto',
};
const NOW = () => new Date('2027-01-04T12:00:00Z');

describe('media store (E-10)', () => {
  it('keeps every key under the tenant prefix', () => {
    expect(mediaKey({ tenantId: 't1', messageId: 'm1', mime: 'audio/ogg; codecs=opus' })).toBe(
      'tenants/t1/media/m1.ogg',
    );
    expect(mediaKey({ tenantId: 't1', messageId: 'm1', mime: 'x/unknown' })).toBe(
      'tenants/t1/media/m1.bin',
    );
  });

  it('stays off until every R2 variable is set, and derives the endpoint from the account', () => {
    expect(r2Config({ R2_ACCOUNT_ID: 'acct', R2_MEDIA_BUCKET: 'media' })).toBeUndefined();
    expect(
      r2Config({
        R2_ACCOUNT_ID: 'acct',
        R2_ACCESS_KEY_ID: 'id',
        R2_SECRET_ACCESS_KEY: 'secret',
        R2_MEDIA_BUCKET: 'media',
      }),
    ).toMatchObject({ endpoint: 'https://acct.r2.cloudflarestorage.com', bucket: 'media' });
  });

  it('uploads with a signed PUT and hands out a signed GET', async () => {
    const fake = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })));
    const store = createMediaStore(CONFIG, { fetch: fake, now: NOW });
    await store.put('tenants/t1/media/m1.ogg', { bytes: new Uint8Array([1]), mime: 'audio/ogg' });
    const [url, init] = fake.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('acct.r2.cloudflarestorage.com/media/tenants/t1/media/m1.ogg?');
    expect(url).toContain('X-Amz-Signature=');
    expect(init.method).toBe('PUT');
    expect(store.signedUrl('tenants/t1/media/m1.ogg')).toContain('X-Amz-Expires=300');
  });

  it('fails the upload when R2 refuses it', async () => {
    const store = createMediaStore(CONFIG, {
      fetch: () => Promise.resolve(new Response(null, { status: 403 })),
      now: NOW,
    });
    await expect(store.put('k', { bytes: new Uint8Array(), mime: 'image/png' })).rejects.toThrow(
      '403',
    );
  });
});
