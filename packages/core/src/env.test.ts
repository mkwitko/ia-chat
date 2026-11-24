import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.ts';

const valid = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgres://user:s3cret-value@127.0.0.1:5432/app',
};

describe('parseEnv', () => {
  it('returns typed values for a valid environment', () => {
    expect(parseEnv(valid)).toEqual(valid);
  });

  it('defaults NODE_ENV to development', () => {
    expect(parseEnv({ DATABASE_URL: valid.DATABASE_URL }).NODE_ENV).toBe('development');
  });

  it('fails naming every invalid variable', () => {
    expect(() => parseEnv({ NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV[\s\S]*DATABASE_URL|DATABASE_URL[\s\S]*NODE_ENV/,
    );
  });

  it('never echoes variable values in the error', () => {
    const secret = 'not-a-url-but-a-s3cret';
    expect(() => parseEnv({ DATABASE_URL: secret })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ DATABASE_URL: secret })).not.toThrow(new RegExp(secret));
  });
});
