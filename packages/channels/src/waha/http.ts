// HTTP to the WAHA container on the private network (spec 03, "Motor da conexão por QR code").

const API_KEY_HEADER = 'x-api-key';
const JSON_TYPE = 'application/json';
const POST = 'POST';
const CALL_FAILED = 'waha request failed';

export interface WahaConfig {
  /** Inside the private network, e.g. http://waha:3000 (never public). */
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch | undefined;
}

export class WahaError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type WahaCall = (path: string, body?: object) => Promise<unknown>;

/** JSON in and out, with the API key. A non-2xx answer throws `WahaError` with the status. */
export function wahaCaller(config: WahaConfig): WahaCall {
  return async (path, body) => {
    const response = await wahaFetch(config, path, body);
    const text = await response.text();
    if (!response.ok) throw new WahaError(response.status, CALL_FAILED);
    return text ? (JSON.parse(text) as unknown) : null;
  };
}

export function wahaFetch(config: WahaConfig, path: string, body?: object): Promise<Response> {
  const headers: Record<string, string> = { [API_KEY_HEADER]: config.apiKey, accept: JSON_TYPE };
  const init: RequestInit = body
    ? {
        method: POST,
        headers: { ...headers, 'content-type': JSON_TYPE },
        body: JSON.stringify(body),
      }
    : { headers };
  return (config.fetch ?? fetch)(`${config.baseUrl}${path}`, init);
}
