import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

const MAX_RETRIES = 2;
const CLIENT_ERROR = 400;
const SERVER_ERROR = 500;

/** A 4xx answer will not change by asking again; network and 5xx errors get two retries. */
function shouldRetry(failures: number, error: Error): boolean {
  const clientError =
    error instanceof ApiError && error.status >= CLIENT_ERROR && error.status < SERVER_ERROR;
  return !clientError && failures < MAX_RETRIES;
}

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });
