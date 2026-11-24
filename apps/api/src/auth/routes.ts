import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ErrorCode, HttpStatus } from '../http.ts';
import { AUTH_BASE_PATH } from './auth.ts';

const AUTH_METHODS = ['GET', 'POST'];

/** Forwards /api/auth/* to Better Auth as a Fetch request. */
export function registerAuthRoutes(app: FastifyInstance): void {
  app.route({
    method: AUTH_METHODS,
    url: `${AUTH_BASE_PATH}/*`,
    async handler(request, reply) {
      try {
        const response = await app.auth.handler(toFetchRequest(request));
        reply.status(response.status);
        for (const [key, value] of response.headers) reply.header(key, value);
        return await reply.send(response.body ? await response.text() : null);
      } catch (error) {
        request.log.error({ err: error }, ErrorCode.authFailure);
        return reply.status(HttpStatus.internalError).send({ error: ErrorCode.authFailure });
      }
    },
  });
}

function toFetchRequest(request: FastifyRequest): Request {
  const url = new URL(request.url, `${request.protocol}://${request.host}`);
  const body = request.body ? JSON.stringify(request.body) : undefined;
  return new Request(url, {
    method: request.method,
    headers: fromNodeHeaders(request.headers),
    ...(body === undefined ? {} : { body }),
  });
}
