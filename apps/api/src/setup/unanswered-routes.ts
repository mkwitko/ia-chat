import { KnowledgeSource, type Tx } from '@app/db';
import { Task, type AiGateway } from '@app/ai';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from './audit.ts';
import {
  checkedSuggestion,
  SUGGEST_INSTRUCTIONS,
  suggestionInput,
  suggestionSchema,
} from './faq-suggestion.ts';
import { notFound, parsed } from './guarded.ts';
import { groupPending, type PendingGroup } from './unanswered-groups.ts';

// Spec 10, "Assistente": questions the assistant could not answer (knowledge_items with
// source=unanswered, no answer, inactive), folded by similarity. Approving one turns it into an
// active item the assistant reads; dismissing removes the whole group.

const BASE = '/api/knowledge/unanswered';
const ENTITY = 'knowledge_item';
const MAX_QUESTION = 300;
const MAX_ANSWER = 2000;
const MAX_GROUP = 200;
const UNKNOWN = 'unknown';

const PENDING = { source: KnowledgeSource.unanswered, answer: null, active: false } as const;
const ids = z.array(z.uuid()).min(1).max(MAX_GROUP);
const approveSchema = z
  .object({
    ids,
    question: z.string().trim().min(1).max(MAX_QUESTION),
    answer: z.string().trim().min(1).max(MAX_ANSWER),
  })
  .strict();
const dismissSchema = z.object({ ids }).strict();
const suggestSchema = z.object({ question: z.string().trim().min(1).max(MAX_QUESTION) }).strict();

export async function pendingGroups(tx: Tx): Promise<PendingGroup[]> {
  const rows = await tx.knowledgeItem.findMany({
    where: PENDING,
    orderBy: { createdAt: 'asc' },
    select: { id: true, question: true, createdAt: true },
  });
  return groupPending(rows);
}

export async function pendingCount(tx: Tx): Promise<number> {
  return (await pendingGroups(tx)).length;
}

export function registerUnansweredRoutes(
  app: FastifyInstance,
  deps: { gateway: AiGateway | undefined },
): void {
  const manage = { preHandler: requireTenant(Permission.assistantManage) };
  app.post(`${BASE}/approve`, manage, approve);
  app.post(`${BASE}/dismiss`, manage, dismiss);
  app.post(`${BASE}/suggest`, manage, (request, reply) => suggest(request, reply, deps.gateway));
}

async function approve(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, approveSchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const kept = await tenant.withTenant(async (tx) => {
    const group = await tx.knowledgeItem.findMany({
      where: { ...PENDING, id: { in: body.ids } },
      select: { id: true },
    });
    const [first, ...rest] = group;
    if (!first || group.length !== new Set(body.ids).size) return null;
    await tx.knowledgeItem.deleteMany({ where: { id: { in: rest.map((item) => item.id) } } });
    const item = await tx.knowledgeItem.update({
      where: { id: first.id },
      data: { question: body.question, answer: body.answer, active: true },
      select: { id: true, question: true, answer: true, source: true },
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: item.id,
      action: AuditAction.update,
      after: { question: body.question, answer: body.answer },
    });
    return item;
  });
  return kept ?? notFound(reply);
}

async function dismiss(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, dismissSchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const removed = await tenant.withTenant(async (tx) => {
    const group = await tx.knowledgeItem.findMany({
      where: { ...PENDING, id: { in: body.ids } },
      select: { id: true },
    });
    if (group.length === 0) return 0;
    await tx.knowledgeItem.deleteMany({ where: { id: { in: group.map((item) => item.id) } } });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: group[0]?.id ?? '',
      action: AuditAction.archive,
      before: { dismissed: group.length },
    });
    return group.length;
  });
  return removed > 0 ? { ok: true } : notFound(reply);
}

/** A draft for the owner to edit. Behind an explicit click; nothing is saved here. */
async function suggest(request: FastifyRequest, reply: FastifyReply, gateway?: AiGateway) {
  const input = parsed(request, reply, suggestSchema);
  if (!input) return reply;
  if (!gateway) return reply.code(HttpStatus.unavailable).send({ error: ErrorCode.suggestOff });
  const { tenant, body } = input;
  const source = await tenant.withTenant((tx) => suggestionSource(tx, tenant.tenantId));
  try {
    const { answer } = await gateway.extract({
      tenantId: tenant.tenantId,
      task: Task.faqSuggest,
      instructions: SUGGEST_INSTRUCTIONS,
      input: suggestionInput(body.question, source),
      schema: suggestionSchema,
    });
    return { suggestion: checkedSuggestion(answer) };
  } catch (error) {
    // The error name only: provider errors may carry the generated text.
    request.log.warn(
      { suggestError: error instanceof Error ? error.name : UNKNOWN },
      'faq suggest failed',
    );
    return reply.code(HttpStatus.badGateway).send({ error: ErrorCode.suggestFailed });
  }
}

async function suggestionSource(tx: Tx, tenantId: string) {
  const [row, services, location] = await Promise.all([
    tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, businessProfile: true },
    }),
    tx.service.findMany({
      where: { active: true, visibleToPatient: true },
      select: { name: true },
    }),
    tx.location.findFirst({ select: { address: true } }),
  ]);
  return {
    name: row.name,
    businessProfile: row.businessProfile,
    services: services.map((service) => service.name),
    address: location?.address,
  };
}
