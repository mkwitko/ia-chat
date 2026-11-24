/** JSON call to our API (same origin; the session cookie goes along). Throws ApiError when not ok. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`api ${String(status)}`);
    this.status = status;
  }
}

const GET = 'GET';
const JSON_HEADERS = { 'content-type': 'application/json' };

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const request: RequestInit = { method: init.method ?? GET, credentials: 'same-origin' };
  if (init.body !== undefined) {
    request.headers = JSON_HEADERS;
    request.body = JSON.stringify(init.body);
  }
  const response = await fetch(path, request);
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as T;
}
