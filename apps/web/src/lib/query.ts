import { MutationCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

const MAX_RETRIES = 2;
const CLIENT_ERROR = 400;
const SERVER_ERROR = 500;
/** How long a failed change can still be offered again from its error message. */
const RETRY_FRESH_MS = 2000;

/** A 4xx answer will not change by asking again; network and 5xx errors get two retries. */
function shouldRetry(failures: number, error: Error): boolean {
  const clientError =
    error instanceof ApiError && error.status >= CLIENT_ERROR && error.status < SERVER_ERROR;
  return !clientError && failures < MAX_RETRIES;
}

let lastFailed: { at: number; run: () => Promise<unknown> } | null = null;

/**
 * The change that just failed, to put a "Tentar de novo" button on its error message
 * (Nielsen 9). Null when nothing failed a moment ago. Taking it clears it.
 */
export function takeFailedChange(): (() => Promise<unknown>) | null {
  const failed = lastFailed;
  lastFailed = null;
  return failed && Date.now() - failed.at < RETRY_FRESH_MS ? failed.run : null;
}

const mutationCache = new MutationCache({
  onError: (...[, variables, , mutation]) => {
    lastFailed = { at: Date.now(), run: () => mutation.execute(variables) };
  },
});

export const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: { queries: { retry: shouldRetry } },
});
