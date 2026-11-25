import { KnowledgeSource } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { HttpStatus } from '../http.ts';
import { audit, AuditAction } from './audit.ts';
import { notFound, parsed, tenantOf } from './guarded.ts';

// Spec 10, "Assistente": knowledge base, and the questions the assistant could not answer,
// turned into an answer in one step (RF in E-17).

const PATH = '/api/knowledge';
const ITEM_PATH = '/api/knowledge/:id';
const ENTITY = 'knowledge_item';
const MAX_QUESTION = 300;
const MAX_ANSWER = 2000;
const SELECT = { id: true, question: true, answer: true, source: true } as const;

const bodySchema = z
  .object({
    question: z.string().trim().min(1).max(MAX_QUESTION),
    answer: z.string().trim().min(1).max(MAX_ANSWER),
  })
  .strict();
const paramsSchema = z.object({ id: z.uuid() });

export function registerKnowledgeRoutes(app: FastifyInstance): void {
  const read = { preHandler: requireTenant(Permission.assistantRead) };
  const manage = { preHandler: requireTenant(Permission.assistantManage) };
  app.get(PATH, read, listKnowledge);
  app.post(PATH, manage, createItem);
  app.put(ITEM_PATH, manage, answerItem);
  app.delete(ITEM_PATH, manage, archiveItem);
}

function listKnowledge(request: FastifyRequest) {
  return tenantOf(request).withTenant(async (tx) => {
    const active = await tx.knowledgeItem.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      select: { ...SELECT, createdAt: true },
    });
    return {
      items: active
        .filter((item) => item.answer !== null)
        .map(({ id, question, answer, source }) => ({ id, question, answer, source })),
      unanswered: active
        .filter((item) => item.answer === null)
        .map(({ id, question, createdAt }) => ({ id, question, createdAt })),
    };
  });
}

async function createItem(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const item = await tenant.withTenant(async (tx) => {
    const created = await tx.knowledgeItem.create({
      data: { ...body, tenantId: tenant.tenantId, source: KnowledgeSource.manual },
      select: SELECT,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: created.id,
      action: AuditAction.create,
      after: body,
    });
    return created;
  });
  return reply.code(HttpStatus.created).send(item);
}

async function answerItem(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  const params = paramsSchema.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  const item = await tenant.withTenant(async (tx) => {
    const before = await tx.knowledgeItem.findFirst({
      where: { id: params.data.id, active: true },
      select: SELECT,
    });
    if (!before) return null;
    const after = await tx.knowledgeItem.update({
      where: { id: before.id },
      data: body,
      select: SELECT,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: before.id,
      action: AuditAction.update,
      before,
      after: body,
    });
    return after;
  });
  return item ?? notFound(reply);
}

async function archiveItem(request: FastifyRequest, reply: FastifyReply) {
  const params = paramsSchema.safeParse(request.params);
  if (!params.success) return notFound(reply);
  const tenant = tenantOf(request);
  const archived = await tenant.withTenant(async (tx) => {
    const before = await tx.knowledgeItem.findFirst({
      where: { id: params.data.id, active: true },
      select: SELECT,
    });
    if (!before) return false;
    await tx.knowledgeItem.update({ where: { id: before.id }, data: { active: false } });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: before.id,
      action: AuditAction.archive,
      before,
    });
    return true;
  });
  return archived ? { ok: true } : notFound(reply);
}
