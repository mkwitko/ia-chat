import { randomUUID } from 'node:crypto';
import { NodeEnv } from '@app/core';
import { recordOpsEvent } from '@app/db';
import { createAlert, loggerOptions, Sentry } from '@app/observability';
import type { FastifyInstance } from 'fastify';
import * as z from 'zod';
import type { AppDeps } from './app.ts';
import type { ApiEnv } from './env.ts';
import { registerHealthRoutes } from './health/health-routes.ts';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_LABEL = 'requestId';
const safeRequestId = z.string().regex(/^[\w-]{8,64}$/);
const API_SERVICE = 'api';
const SERVER_ERROR = 500;

// Keeps an upstream id (proxy, load balancer) when it is a plain token; anything else is replaced.
function requestIdOf(header: string | string[] | undefined): string {
  const parsed = safeRequestId.safeParse(header);
  return parsed.success ? parsed.data : randomUUID();
}

/** Fastify options: shared pino config (redaction, service, Axiom) and the request id. */
export function fastifyObservability(env: ApiEnv) {
  return {
    logger:
      env.NODE_ENV === NodeEnv.test
        ? (false as const)
        : loggerOptions({ service: API_SERVICE, ...env, level: env.LOG_LEVEL }),
    requestIdLogLabel: REQUEST_ID_LABEL,
    genReqId: (request: { headers: Record<string, string | string[] | undefined> }) =>
      requestIdOf(request.headers[REQUEST_ID_HEADER]),
  };
}

/** Request id on the response, unhandled 5xx to Sentry, `app.alert` and the health routes. */
export function setupObservability(app: FastifyInstance, deps: AppDeps): void {
  app.addHook('onRequest', (request, reply) => {
    void reply.header(REQUEST_ID_HEADER, request.id);
    return Promise.resolve();
  });
  // No-op without SENTRY_DSN; the scrubber in @app/observability cleans the event.
  app.addHook('onError', (request, _reply, error) => {
    if ((error.statusCode ?? SERVER_ERROR) >= SERVER_ERROR) {
      Sentry.captureException(error, { tags: { requestId: request.id } });
    }
    return Promise.resolve();
  });
  app.decorate(
    'alert',
    deps.alert ?? createAlert({ log: app.log, record: (alert) => recordOpsEvent(deps.db, alert) }),
  );
  registerHealthRoutes(app, deps);
}
