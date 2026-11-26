import { describe, expect, it } from 'vitest';
import { presignUrl } from './sigv4.ts';

// The example in AWS's "Authenticating Requests: Using Query Parameters" documentation.
describe('presignUrl', () => {
  it('reproduces the signature AWS publishes for its GET example', () => {
    const url = presignUrl(
      {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
      },
      {
        method: 'GET',
        host: 'examplebucket.s3.amazonaws.com',
        path: '/test.txt',
        expiresSeconds: 86_400,
        now: new Date('2013-05-24T00:00:00Z'),
      },
    );
    expect(url).toContain(
      'X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
    );
  });
});
