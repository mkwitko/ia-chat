import { createDb, type Db } from '@app/db';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.ts';
import { MemoryOutbox } from '../email/outbox.ts';
import { parseApiEnv } from '../env.ts';
import type { TurnstileVerifier } from './turnstile.ts';

// S-01: POST /api/waitlist with a fake Turnstile verifier (never calls Cloudflare).

const SITE = 'https://site.exemplo.test';
const GOOD_TOKEN = 'token-valido';
const URL = '/api/waitlist';

let app: FastifyInstance;
let db: Db;
const outbox = new MemoryOutbox();
const verify: TurnstileVerifier = (token) => Promise.resolve(token === GOOD_TOKEN);

beforeAll(async () => {
  const env = parseApiEnv({
    ...process.env,
    NODE_ENV: 'test',
    BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    BETTER_AUTH_URL: 'http://localhost:3000',
    WEB_ORIGIN: 'http://localhost:5173',
    SITE_ORIGIN: SITE,
    TURNSTILE_SECRET_KEY: 'segredo-de-teste',
  });
  db = createDb(env.DATABASE_URL);
  app = buildApp({ env, db, email: outbox, verifyTurnstile: verify });
  await app.ready();
});
afterAll(() => app.close());

const email = () => `lista-${randomUUID()}@exemplo.test`;
const signup = (payload: object, headers: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url: URL, payload, headers: { origin: SITE, ...headers } });
const stored = (address: string) =>
  db.client.waitlistEntry.count({ where: { email: address.toLowerCase() } });

describe('waitlist', () => {
  it('stores a valid signup and sends the confirmation email', async () => {
    const address = email();
    const response = await signup({ email: address, name: 'Rafael', token: GOOD_TOKEN });
    expect(response.statusCode).toBe(201);
    expect(await stored(address)).toBe(1);
    expect(outbox.sent.filter((m) => m.to === address)).toHaveLength(1);
  });

  it('refuses an invalid Turnstile token and stores nothing', async () => {
    const address = email();
    const response = await signup({ email: address, token: 'falso' });
    expect(response.statusCode).toBe(400);
    expect(await stored(address)).toBe(0);
    expect(outbox.sent.some((m) => m.to === address)).toBe(false);
  });

  it('refuses a malformed email', async () => {
    const response = await signup({ email: 'isto-nao-e-email', token: GOOD_TOKEN });
    expect(response.statusCode).toBe(400);
  });

  it('is idempotent: the same email (any case) keeps one row and one message', async () => {
    const address = email();
    await signup({ email: address, token: GOOD_TOKEN });
    const again = await signup({ email: address.toUpperCase(), token: GOOD_TOKEN });
    expect(again.statusCode).toBe(201);
    expect(await stored(address)).toBe(1);
    expect(outbox.sent.filter((m) => m.to === address.toLowerCase())).toHaveLength(1);
  });

  it('answers CORS only for the configured site origin', async () => {
    const ok = await signup({ email: email(), token: GOOD_TOKEN });
    expect(ok.headers['access-control-allow-origin']).toBe(SITE);
    const other = await signup({ email: email(), token: GOOD_TOKEN }, { origin: 'https://x.test' });
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
    const preflight = await app.inject({ method: 'OPTIONS', url: URL, headers: { origin: SITE } });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(SITE);
  });

  it('limits repeated attempts from the same address', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const response = await app.inject({
        method: 'POST',
        url: URL,
        remoteAddress: '203.0.113.9',
        payload: { email: email(), token: 'falso' },
      });
      codes.push(response.statusCode);
    }
    expect(codes).toContain(429);
  });
});
