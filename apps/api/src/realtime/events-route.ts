import type { FastifyInstance } from 'fastify';
import { requireTenant } from '../auth/tenant-guard.ts';
import type { InboxHub } from './inbox-hub.ts';

export const EVENTS_PATH = '/api/events';
export const EVENT_NAME = 'inbox';

const HEARTBEAT_MS = 25_000;
const SSE_HEADERS = {
  'content-type': 'text/event-stream',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  // Proxies must not buffer the stream.
  'x-accel-buffering': 'no',
} as const;
const HTTP_OK = 200;

/**
 * SSE for the panel (spec 10, "Tempo real"): one event per change in a conversation of the
 * caller's tenant, carrying only its id. The panel refetches; content never travels here.
 */
export function registerEventsRoute(app: FastifyInstance, hub: InboxHub): void {
  app.get(EVENTS_PATH, { preHandler: requireTenant() }, async (request, reply) => {
    const tenant = request.tenant;
    if (!tenant) return reply;
    reply.hijack();
    const { raw } = reply;
    raw.writeHead(HTTP_OK, SSE_HEADERS);
    raw.write(': connected\n\n');
    const unsubscribe = await hub.subscribe(tenant.tenantId, (change) => {
      raw.write(`event: ${EVENT_NAME}\ndata: ${JSON.stringify(change)}\n\n`);
    });
    const heartbeat = setInterval(() => raw.write(': ping\n\n'), HEARTBEAT_MS);
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
    return reply;
  });
}
