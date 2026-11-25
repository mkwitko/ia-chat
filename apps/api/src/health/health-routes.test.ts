import { afterEach, describe, expect, it } from 'vitest';
import { startTestApp, type TestAppOptions, type TestContext } from '../test-support.ts';

// E-26: liveness and readiness are public and carry no detail.

const OK = 200;
const UNAVAILABLE = 503;

const started: TestContext[] = [];
afterEach(async () => {
  await Promise.all(started.splice(0).map((ctx) => ctx.app.close()));
});
async function start(options?: TestAppOptions) {
  const ctx = await startTestApp(undefined, options);
  started.push(ctx);
  return ctx;
}

describe('health and readiness', () => {
  it('answers liveness without touching dependencies', async () => {
    const ctx = await start();
    const response = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(OK);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('is ready when the database and the queue answer', async () => {
    const ctx = await start({ checkQueue: () => Promise.resolve([]) });
    const response = await ctx.app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(OK);
    expect(response.json()).toEqual({ ready: true, checks: { database: 'ok', queue: 'ok' } });
  });

  it('is not ready when the queue is unreachable, and says nothing about why', async () => {
    const ctx = await start({
      checkQueue: () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.9:5432')),
    });
    const response = await ctx.app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(UNAVAILABLE);
    expect(response.body).not.toContain('ECONNREFUSED');
    expect(response.json()).toEqual({ ready: false, checks: { database: 'ok', queue: 'fail' } });
  });

  it('echoes a safe request id and replaces an unsafe one', async () => {
    const ctx = await start();
    const kept = await ctx.app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'req-12345678' },
    });
    expect(kept.headers['x-request-id']).toBe('req-12345678');
    const replaced = await ctx.app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'bad id\twith spaces' },
    });
    expect(replaced.headers['x-request-id']).not.toContain(' ');
  });
});
