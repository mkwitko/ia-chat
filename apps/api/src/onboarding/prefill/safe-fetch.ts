import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';

// Spec 09 prefill: the server reads one public page the owner pointed to. SSRF guard: only
// http(s), and every address the name resolves to is checked when the socket connects (the
// `lookup` hook), so DNS rebinding and redirects to private ranges are refused too.

export const FetchLimit = {
  timeoutMs: 8_000,
  maxBytes: 1_000_000,
  maxRedirects: 3,
} as const;

export const FetchError = {
  badUrl: 'bad_url',
  blocked: 'blocked_address',
  status: 'bad_status',
  notText: 'not_text',
  timeout: 'timeout',
} as const;
export type FetchError = (typeof FetchError)[keyof typeof FetchError];

export class PageFetchError extends Error {
  readonly code: FetchError;
  constructor(code: FetchError) {
    super(code);
    this.code = code;
  }
}

/** Reads a page as text; the route depends on this signature (tests pass a fake). */
export type PageFetcher = (url: string) => Promise<string>;

// Loopback, private, link-local, CGNAT, benchmark, multicast and reserved ranges.
/* eslint-disable sonarjs/no-hardcoded-ip -- these addresses are the blocklist itself */
const BLOCKED_V4 = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '224.0.0.0/3',
];
const BLOCKED_V6 = ['::/127', 'fc00::/7', 'fe80::/10', 'ff00::/8'];
/* eslint-enable sonarjs/no-hardcoded-ip */
const BLOCKED = new BlockList();
const CIDR_SEPARATOR = '/';
const addAll = (ranges: readonly string[], family: 'ipv4' | 'ipv6') => {
  for (const range of ranges) {
    const [network = '', prefix = ''] = range.split(CIDR_SEPARATOR);
    BLOCKED.addSubnet(network, Number(prefix), family);
  }
};
addAll(BLOCKED_V4, 'ipv4');
addAll(BLOCKED_V6, 'ipv6');

const IPV4_MAPPED = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;
const IPV4 = 4;
const HTTPS_PROTOCOL = 'https:';
const PROTOCOLS = new Set(['http:', HTTPS_PROTOCOL]);
const TEXT_TYPES = /^(text\/html|text\/plain|application\/xhtml\+xml)/i;
const OK = 200;
const REDIRECT_FROM = 300;
const REDIRECT_TO = 399;
const HEADERS = { 'user-agent': 'ConsultorioAberto-Prefill/1.0', accept: 'text/html,text/plain' };

/** Loopback, private, link-local, CGNAT, multicast and reserved ranges (IPv4-mapped too). */
export function isBlockedAddress(address: string): boolean {
  const mapped = IPV4_MAPPED.exec(address)?.[1];
  if (mapped) return isBlockedAddress(mapped);
  const family = isIP(address);
  if (family === 0) return true;
  return BLOCKED.check(address, family === IPV4 ? 'ipv4' : 'ipv6');
}

/** DNS lookup that fails when any resolved address is blocked (checked at connect time). */
export const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    const first = addresses[0];
    if (error) callback(error, '', 0);
    else if (!first || addresses.some((item) => isBlockedAddress(item.address)))
      callback(new PageFetchError(FetchError.blocked), '', 0);
    else if (options.all) (callback as unknown as AllCallback)(null, addresses);
    else callback(null, first.address, first.family);
  });
};
type AllCallback = (error: Error | null, addresses: LookupAddress[]) => void;

/** The URL to fetch, or a PageFetchError: http(s) only, no literal private IP. */
export function checkedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PageFetchError(FetchError.badUrl);
  }
  if (!PROTOCOLS.has(url.protocol) || url.username || url.password)
    throw new PageFetchError(FetchError.badUrl);
  // A literal IP skips the lookup hook: check it here.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) !== 0 && isBlockedAddress(host)) throw new PageFetchError(FetchError.blocked);
  return url;
}

export const fetchPage: PageFetcher = (raw) => fetchWithRedirects(raw, 0);

async function fetchWithRedirects(raw: string, hops: number): Promise<string> {
  const url = checkedUrl(raw);
  const result = await getOnce(url);
  if ('text' in result) return result.text;
  if (hops >= FetchLimit.maxRedirects) throw new PageFetchError(FetchError.status);
  return fetchWithRedirects(new URL(result.location, url).href, hops + 1);
}

function getOnce(url: URL): Promise<{ text: string } | { location: string }> {
  const client = url.protocol === HTTPS_PROTOCOL ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.get(url, { lookup: guardedLookup, headers: HEADERS }, (response) => {
      const location = response.headers.location;
      const status = response.statusCode ?? 0;
      if (status >= REDIRECT_FROM && status <= REDIRECT_TO && location) {
        response.resume();
        resolve({ location });
        return;
      }
      readBody(response).then((text) => {
        resolve({ text });
      }, reject);
    });
    // One deadline for connect, headers and body together.
    const deadline = setTimeout(() => {
      request.destroy(new PageFetchError(FetchError.timeout));
    }, FetchLimit.timeoutMs);
    request.on('close', () => {
      clearTimeout(deadline);
    });
    request.on('error', reject);
  });
}

function readBody(response: IncomingMessage): Promise<string> {
  if (response.statusCode !== OK) {
    response.resume();
    return Promise.reject(new PageFetchError(FetchError.status));
  }
  if (!TEXT_TYPES.test(response.headers['content-type'] ?? '')) {
    response.resume();
    return Promise.reject(new PageFetchError(FetchError.notText));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= FetchLimit.maxBytes) chunks.push(chunk);
      // Past the cap, keep what we have: the start of a page holds name, address and hours.
      else response.destroy();
    });
    response.on('close', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    response.on('error', reject);
  });
}
