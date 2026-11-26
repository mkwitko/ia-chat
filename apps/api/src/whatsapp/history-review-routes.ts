import { HistoryImportState } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, parsed, tenantOf } from '../setup/guarded.ts';
import {
  confirmStaged,
  discardStaged,
  listStaged,
  previewStaged,
  reviewChannel,
} from './history-review.ts';

// E-24b, spec 03 "Revisar importação": the owner picks who becomes a client and whose messages
// come over. Confirming or discarding is only possible once the history finished arriving, because
// both delete what was not chosen.

const PATH = '/api/whatsapp/history-import/review';
const ENTITY = 'history_import';
const MAX_SELECTIONS = 5000;

const idParams = z.object({ id: z.uuid() });
const confirmBody = z
  .object({
    selections: z
      .array(z.object({ id: z.uuid(), messages: z.boolean() }).strict())
      .max(MAX_SELECTIONS),
  })
  .strict();

const guard = { preHandler: requireTenant(Permission.whatsappManage) };

export function registerHistoryReviewRoutes(app: FastifyInstance): void {
  app.get(PATH, guard, async (request) => {
    const tenant = tenantOf(request);
    return tenant.withTenant(async (tx) => {
      const channel = await reviewChannel(tx);
      return { contacts: channel ? await listStaged(tx, channel.id) : [] };
    });
  });
  app.get(`${PATH}/:id/messages`, guard, async (request, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return notFound(reply);
    const { id } = params.data;
    return { messages: await tenantOf(request).withTenant((tx) => previewStaged(tx, id)) };
  });
  app.post(`${PATH}/confirm`, guard, (request, reply) => confirm(request, reply));
  app.post(`${PATH}/discard`, guard, (request, reply) => discard(request, reply));
}

/** The channel when its history finished arriving; otherwise the 409 or 404 already sent. */
async function readyChannel(request: FastifyRequest, reply: FastifyReply) {
  const channel = await tenantOf(request).withTenant(reviewChannel);
  if (!channel) return void notFound(reply);
  if (channel.historyImport === HistoryImportState.done) return channel;
  return void reply.code(HttpStatus.conflict).send({ error: ErrorCode.historyNotDone });
}

async function confirm(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, confirmBody);
  if (!input) return reply;
  const channel = await readyChannel(request, reply);
  if (!channel) return reply;
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    const result = await confirmStaged(tx, {
      tenantId: tenant.tenantId,
      channelId: channel.id,
      selections: body.selections,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: channel.id,
      action: AuditAction.update,
      after: { ...result, discardedRest: true },
    });
    return result;
  });
}

async function discard(request: FastifyRequest, reply: FastifyReply) {
  const channel = await readyChannel(request, reply);
  if (!channel) return reply;
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    await discardStaged(tx, { tenantId: tenant.tenantId, channelId: channel.id });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: channel.id,
      action: AuditAction.update,
      after: { discardedAll: true },
    });
    return { ok: true };
  });
}
