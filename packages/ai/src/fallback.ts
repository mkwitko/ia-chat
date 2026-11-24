import { APICallError } from 'ai';
import type { ModelRef, Route } from './models.ts';

const RATE_LIMITED = 429;
const SERVER_ERROR = 500;
const TIMEOUT_ERRORS = new Set(['TimeoutError', 'AbortError']);
const DEFAULT_TIMEOUT_MS = 40_000; // conversation agent timeout, spec 04

export interface FallbackResult<T> {
  value: T;
  model: ModelRef;
  usedFallback: boolean;
}

export interface FallbackOptions {
  timeoutMs?: number;
}

type Attempt<T> = (model: ModelRef, signal: AbortSignal) => Promise<T>;

/** Timeout, rate limit and 5xx switch to the fallback model, once. Client errors surface. */
export async function withFallback<T>(
  route: Route,
  attempt: Attempt<T>,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: FallbackOptions = {},
): Promise<FallbackResult<T>> {
  try {
    const value = await attempt(route.primary, AbortSignal.timeout(timeoutMs));
    return { value, model: route.primary, usedFallback: false };
  } catch (error) {
    if (!route.fallback || !isRetryable(error)) throw error;
    const value = await attempt(route.fallback, AbortSignal.timeout(timeoutMs));
    return { value, model: route.fallback, usedFallback: true };
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error && TIMEOUT_ERRORS.has(error.name)) return true;
  if (!APICallError.isInstance(error)) return false;
  const status = error.statusCode ?? 0;
  return status === RATE_LIMITED || status >= SERVER_ERROR;
}
