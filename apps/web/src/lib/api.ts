/** JSON call to our API (same origin; the session cookie goes along). Throws ApiError when not ok. */
export class ApiError extends Error {
  readonly status: number;
  /** The `error` code of the response body, when the API sent one (e.g. `slot_taken`). */
  readonly code: string | undefined;
  constructor(status: number, code?: string) {
    super(`api ${String(status)}`);
    this.status = status;
    this.code = code;
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
  if (!response.ok) throw new ApiError(response.status, await errorCode(response));
  return (await response.json()) as T;
}

async function errorCode(response: Response): Promise<string | undefined> {
  const body: unknown = await response.json().catch(() => null);
  const code = body instanceof Object && 'error' in body ? body.error : undefined;
  // eslint-disable-next-line no-restricted-syntax -- typeof needs its literal to narrow
  return typeof code === 'string' ? code : undefined;
}
