import { parsePolicy, resolveTemplate } from '@app/core';
import { KnowledgeSource, type Tx } from '@app/db';

export interface TemplateResult {
  services: number;
  answers: number;
}

/**
 * Creates the specialty's example services and answers the tenant does not have yet.
 * Matching by name/question makes applying twice a no-op, and keeps what the professional edited.
 */
export async function applyTemplate(
  tx: Tx,
  { tenantId, specialty }: { tenantId: string; specialty: string },
): Promise<TemplateResult> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { specialtyPolicy: { select: { rules: true } } },
  });
  const { pricesForbidden } = parsePolicy(tenant.specialtyPolicy?.rules);
  const template = resolveTemplate({ specialty, pricesForbidden });

  const haveServices = new Set(
    (await tx.service.findMany({ where: { active: true }, select: { name: true } })).map(
      (service) => service.name,
    ),
  );
  const haveQuestions = new Set(
    (await tx.knowledgeItem.findMany({ where: { active: true }, select: { question: true } })).map(
      (item) => item.question,
    ),
  );
  const services = template.services.filter((service) => !haveServices.has(service.name));
  const answers = template.answers.filter((item) => !haveQuestions.has(item.question));

  await tx.service.createMany({ data: services.map((service) => ({ ...service, tenantId })) });
  await tx.knowledgeItem.createMany({
    data: answers.map(({ question, answer }) => ({
      question,
      answer,
      tenantId,
      source: KnowledgeSource.manual,
    })),
  });
  return { services: services.length, answers: answers.length };
}
