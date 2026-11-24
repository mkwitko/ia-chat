import type { ChannelSend } from '@app/channels';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { DraftAction, decideDraft, OutboundResult, sendFromPanel } from './outbound.ts';
import { listConversations, readConversation } from './view.ts';

export const CONVERSATIONS_PATH = '/api/conversations';
export const CONVERSATION_PATH = '/api/conversations/:id';
export const MESSAGES_PATH = '/api/conversations/:id/messages';
export const DRAFT_PATH = '/api/conversations/:id/draft';
export const READ_PATH = '/api/conversations/:id/read';

const MAX_TEXT = 4096;
const paramsSchema = z.object({ id: z.uuid() });
const textSchema = z.string().trim().min(1).max(MAX_TEXT);
const messageSchema = z.object({ text: textSchema }).strict();
const draftSchema = z
  .object({ action: z.enum(DraftAction), turnId: z.uuid(), text: textSchema.optional() })
  .strict()
  .refine((body) => body.action !== DraftAction.edit || body.text !== undefined);

/** Inbox for the panel (spec 10, "Conversas"): list, detail, send, draft decisions. Any member. */
export function registerInboxRoutes(app: FastifyInstance, deps: { send: ChannelSend }): void {
  const guard = { preHandler: requireTenant() };
  app.get(CONVERSATIONS_PATH, guard, async (request) =>
    request.tenant?.withTenant(listConversations),
  );
  app.get(CONVERSATION_PATH, guard, detail);
  app.post(READ_PATH, guard, markRead);
  app.post(MESSAGES_PATH, guard, (request, reply) => outbound(request, reply, deps.send));
  app.post(DRAFT_PATH, guard, (request, reply) => draft(request, reply, deps.send));
}

const invalid = (reply: FastifyReply) =>
  reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
const notFound = (reply: FastifyReply) =>
  reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });

async function detail(request: FastifyRequest, reply: FastifyReply) {
  const params = paramsSchema.safeParse(request.params);
  const tenant = request.tenant;
  if (!params.success || !tenant) return invalid(reply);
  // RLS: another tenant's conversation is simply not found.
  const found = await tenant.withTenant((tx) => readConversation(tx, params.data.id));
  return found ?? notFound(reply);
}

async function markRead(request: FastifyRequest, reply: FastifyReply) {
  const params = paramsSchema.safeParse(request.params);
  const tenant = request.tenant;
  if (!params.success || !tenant) return invalid(reply);
  const { count } = await tenant.withTenant((tx) =>
    tx.conversation.updateMany({ where: { id: params.data.id }, data: { unreadCount: 0 } }),
  );
  return count === 0 ? notFound(reply) : { read: true };
}

async function outbound(request: FastifyRequest, reply: FastifyReply, send: ChannelSend) {
  const params = paramsSchema.safeParse(request.params);
  const body = messageSchema.safeParse(request.body);
  const tenant = request.tenant;
  if (!params.success || !body.success || !tenant) return invalid(reply);
  const who = { tenantId: tenant.tenantId, userId: tenant.userId, conversationId: params.data.id };
  const result = await attempt(reply, () =>
    tenant.withTenant((tx) => sendFromPanel(tx, { who, text: body.data.text, send })),
  );
  return result === undefined ? reply : answer(reply, result);
}

async function draft(request: FastifyRequest, reply: FastifyReply, send: ChannelSend) {
  const params = paramsSchema.safeParse(request.params);
  const body = draftSchema.safeParse(request.body);
  const tenant = request.tenant;
  if (!params.success || !body.success || !tenant) return invalid(reply);
  const who = { tenantId: tenant.tenantId, userId: tenant.userId, conversationId: params.data.id };
  const result = await attempt(reply, () =>
    tenant.withTenant((tx) => decideDraft(tx, { who, send, ...body.data })),
  );
  return result === undefined ? reply : answer(reply, result);
}

/** The channel failing must roll back and say so, never look like a sent message. */
async function attempt(
  reply: FastifyReply,
  run: () => Promise<OutboundResult>,
): Promise<OutboundResult | undefined> {
  try {
    return await run();
  } catch (error) {
    reply.log.error({ error: String(error) }, ErrorCode.sendFailed);
    await reply.code(HttpStatus.badGateway).send({ error: ErrorCode.sendFailed });
    return undefined;
  }
}

function answer(reply: FastifyReply, result: OutboundResult) {
  if (result === OutboundResult.notFound) return notFound(reply);
  if (result === OutboundResult.stale)
    return reply.code(HttpStatus.conflict).send({ error: ErrorCode.staleDraft });
  return reply.code(HttpStatus.ok).send({ result });
}
