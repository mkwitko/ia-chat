import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { audit, AuditAction } from './audit.ts';
import { parsed, tenantOf } from './guarded.ts';
import { DEFAULT_ANSWERS, toneAnswersSchema, toneBodySchema, toneText } from './tone.ts';

const PATH = '/api/tone';
const ENTITY = 'professional_tone';

export function registerToneRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant(Permission.assistantRead) }, readTone);
  app.put(PATH, { preHandler: requireTenant(Permission.assistantManage) }, saveTone);
}

async function readTone(request: FastifyRequest) {
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    // The agent speaks for the first professional (apps/worker context); the panel edits it.
    const professional = await tx.professional.findFirst({ orderBy: { createdAt: 'asc' } });
    const answers = toneAnswersSchema.safeParse(professional?.toneAnswers);
    return {
      professionalName: professional?.name ?? '',
      answers: answers.success ? answers.data : DEFAULT_ANSWERS,
      examples: professional?.messageExamples ?? [],
    };
  });
}

async function saveTone(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, toneBodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const data = {
    name: body.professionalName,
    toneAnswers: body.answers,
    toneOfVoice: toneText(body.answers),
    messageExamples: body.examples,
  };
  await tenant.withTenant(async (tx) => {
    const current = await tx.professional.findFirst({ orderBy: { createdAt: 'asc' } });
    const saved = current
      ? await tx.professional.update({ where: { id: current.id }, data })
      : await tx.professional.create({ data: { ...data, tenantId: tenant.tenantId } });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: saved.id,
      action: current ? AuditAction.update : AuditAction.create,
      after: body,
    });
  });
  return body;
}
