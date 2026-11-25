import { markStep, OnboardingStep, isTemplateKey, SKIPPABLE_STEPS, StepStatus } from '@app/core';
import { Autonomy, TenantStatus } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, parsed, tenantOf } from '../setup/guarded.ts';
import { applyTemplate } from './apply-template.ts';
import { progressView, readProgress, saveProgress } from './progress.ts';

// Spec 09, "Cadastro e ativação sem ajuda": eight steps with progress saved on the server.

const PATH = '/api/onboarding';
const STEP_PATH = '/api/onboarding/steps/:step';
const SPECIALTY_PATH = '/api/onboarding/specialty';
const TEMPLATE_PATH = '/api/onboarding/template';
const ENTITY = 'onboarding';

const stepBody = z.object({ status: z.enum(StepStatus) }).strict();
const stepParams = z.object({ step: z.enum(OnboardingStep) });
const specialtyBody = z.object({ specialty: z.string().refine(isTemplateKey) }).strict();

export function registerOnboardingRoutes(app: FastifyInstance): void {
  const read = { preHandler: requireTenant(Permission.assistantRead) };
  const manage = { preHandler: requireTenant(Permission.assistantManage) };
  app.get(PATH, read, (request) => {
    const tenant = tenantOf(request);
    return tenant.withTenant((tx) => progressView(tx, tenant.tenantId));
  });
  app.put(STEP_PATH, manage, saveStep);
  app.post(SPECIALTY_PATH, manage, chooseSpecialty);
  app.post(TEMPLATE_PATH, manage, useTemplate);
}

async function saveStep(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, stepBody);
  const params = stepParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { step } = params.data;
  const { tenant, body } = input;
  // Only steps that need an external account may be skipped.
  if (body.status === StepStatus.skipped && !SKIPPABLE_STEPS.has(step))
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  return tenant.withTenant(async (tx) => {
    const progress = await readProgress(tx, tenant.tenantId);
    markStep(progress, { step, status: body.status, now: new Date() });
    await saveProgress(tx, { tenantId: tenant.tenantId, progress });
    // Activation never leaves "approve before sending" (RF-13); nothing goes out on its own.
    // After the trial ended without subscription the assistant stays off (RF-88).
    if (step === OnboardingStep.activation && body.status === StepStatus.done)
      await tx.tenant.updateMany({
        where: { id: tenant.tenantId, status: { not: TenantStatus.restricted } },
        data: { autonomy: Autonomy.approve },
      });
    return progressView(tx, tenant.tenantId);
  });
}

async function chooseSpecialty(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, specialtyBody);
  if (!input) return reply;
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    const policy = await tx.specialtyPolicy.findUnique({ where: { specialty: body.specialty } });
    if (!policy) return reply.code(HttpStatus.conflict).send({ error: ErrorCode.invalidRequest });
    const progress = await readProgress(tx, tenant.tenantId);
    progress.specialty = body.specialty;
    markStep(progress, { step: OnboardingStep.account, status: StepStatus.done, now: new Date() });
    await tx.tenant.update({
      where: { id: tenant.tenantId },
      data: { specialtyPolicyId: policy.id, onboardingProgress: progress },
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: tenant.tenantId,
      action: AuditAction.update,
      after: { specialty: body.specialty },
    });
    return progressView(tx, tenant.tenantId);
  });
}

async function useTemplate(request: FastifyRequest, reply: FastifyReply) {
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    const { specialty } = await readProgress(tx, tenant.tenantId);
    if (!specialty)
      return reply.code(HttpStatus.conflict).send({ error: ErrorCode.invalidRequest });
    const created = await applyTemplate(tx, { tenantId: tenant.tenantId, specialty });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: tenant.tenantId,
      action: AuditAction.create,
      after: { template: specialty, ...created },
    });
    return created;
  });
}
