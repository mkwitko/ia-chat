import { createServer, type Server } from 'node:http';

const OK = 200;
const UNAVAILABLE = 503;
const NOT_FOUND = 404;
const READY_PATH = '/ready';
const JSON_TYPE = { 'content-type': 'application/json' };

export const CheckState = { ok: 'ok', fail: 'fail' } as const;
export type CheckState = (typeof CheckState)[keyof typeof CheckState];

export type Checks = Record<string, () => Promise<unknown>>;

export interface Readiness {
  ready: boolean;
  checks: Record<string, CheckState>;
}

/** Runs every check; the result names what failed but never why (no connection strings or errors). */
export async function runChecks(checks: Checks): Promise<Readiness> {
  const entries = await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      const state = await check().then(
        () => CheckState.ok,
        () => CheckState.fail,
      );
      return [name, state] as const;
    }),
  );
  return {
    ready: entries.every(([, state]) => state === CheckState.ok),
    checks: Object.fromEntries(entries),
  };
}

export const readinessStatus = ({ ready }: Readiness) => (ready ? OK : UNAVAILABLE);

/** Tiny readiness endpoint for processes without HTTP (the worker): GET /ready on `port`. */
export function startReadinessServer(port: number, checks: Checks): Promise<Server> {
  const server = createServer((request, response) => {
    if (request.url !== READY_PATH) {
      response.writeHead(NOT_FOUND).end();
      return;
    }
    void runChecks(checks).then((result) => {
      response.writeHead(readinessStatus(result), JSON_TYPE).end(JSON.stringify(result));
    });
  });
  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve(server);
    });
  });
}
