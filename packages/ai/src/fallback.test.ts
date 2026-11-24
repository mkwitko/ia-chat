import { APICallError } from 'ai';
import { describe, expect, it } from 'vitest';
import { withFallback } from './fallback.ts';
import { Provider, type Route } from './models.ts';

const PRIMARY = 'primary';

const route: Route = {
  primary: { provider: Provider.anthropic, model: PRIMARY },
  fallback: { provider: Provider.openai, model: 'fallback' },
};

function apiError(statusCode: number): APICallError {
  return new APICallError({
    message: `status ${String(statusCode)}`,
    url: 'https://example.test',
    requestBodyValues: {},
    statusCode,
  });
}

const failWith = (error: Error) => () => Promise.reject(error);

describe('withFallback', () => {
  it('uses the primary model when it answers', async () => {
    const result = await withFallback(route, (ref) => Promise.resolve(ref.model));
    expect(result).toEqual({ value: 'primary', model: route.primary, usedFallback: false });
  });

  it.each([
    ['rate limit', apiError(429)],
    ['server error', apiError(503)],
    ['timeout', new DOMException('timed out', 'TimeoutError')],
  ])('switches to the fallback on %s', async (_label, error) => {
    const result = await withFallback(route, (ref) =>
      ref.model === PRIMARY ? failWith(error)() : Promise.resolve(ref.model),
    );
    expect(result).toEqual({ value: 'fallback', model: route.fallback, usedFallback: true });
  });

  it('does not hide a client error behind the fallback', async () => {
    await expect(withFallback(route, failWith(apiError(400)))).rejects.toThrow('status 400');
  });

  it('gives up when the route has no fallback', async () => {
    const lone: Route = { primary: route.primary };
    await expect(withFallback(lone, failWith(apiError(503)))).rejects.toThrow('status 503');
  });

  it('times out a slow primary and uses the fallback', async () => {
    const slow = (signal: AbortSignal) =>
      new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(signal.reason as Error);
        });
      });
    const result = await withFallback(
      route,
      (ref, signal) => (ref.model === PRIMARY ? slow(signal) : Promise.resolve(ref.model)),
      { timeoutMs: 20 },
    );
    expect(result.usedFallback).toBe(true);
  });
});
