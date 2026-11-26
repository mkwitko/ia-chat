import { MediaState, createMediaStore, r2Config, readMediaInfo, type MediaStore } from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';

export const MEDIA_PATH = '/api/conversations/:id/messages/:messageId/media';

/** The panel's link to one message's media. */
export const mediaUrl = (conversationId: string, messageId: string) =>
  MEDIA_PATH.replace(':id', conversationId).replace(':messageId', messageId);

const FOUND = 302;
const NO_STORE = 'private, no-store';
const paramsSchema = z.object({ id: z.uuid(), messageId: z.uuid() });

type Signer = Pick<MediaStore, 'signedUrl'> | undefined;

/** Undefined until every R2 variable is set: the route then answers 503. */
export function mediaStoreOf(env: Parameters<typeof r2Config>[0]): Signer {
  const config = r2Config(env);
  return config ? createMediaStore(config) : undefined;
}

/**
 * E-10: opens a patient's image, document or audio. The panel points `<img>`/`<audio>` here
 * (same origin, session cookie); we answer with a short-lived R2 URL, never a public one.
 */
export function registerMediaRoute(app: FastifyInstance, store: Signer): void {
  app.get(MEDIA_PATH, { preHandler: requireTenant() }, (request, reply) =>
    open(request, reply, store),
  );
}

async function open(request: FastifyRequest, reply: FastifyReply, store: Signer) {
  const params = paramsSchema.safeParse(request.params);
  const tenant = request.tenant;
  if (!params.success || !tenant)
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  if (!store) return reply.code(HttpStatus.unavailable).send({ error: ErrorCode.notFound });
  const { id, messageId } = params.data;
  // RLS: another tenant's message is simply not found.
  const message = await tenant.withTenant((tx) =>
    tx.message.findFirst({ where: { id: messageId, conversationId: id }, select: { media: true } }),
  );
  const info = readMediaInfo(message?.media);
  if (info?.state !== MediaState.stored || !info.key)
    return reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
  return reply.header('cache-control', NO_STORE).redirect(store.signedUrl(info.key), FOUND);
}
