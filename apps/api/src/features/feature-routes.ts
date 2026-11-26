import { FEATURES, PlanId, planIncludes, type Feature, type FeatureChoices } from '@app/core';
import { readFeatures, type Tx } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';

// Recursos (H-51; contract in spec 10, "Recursos"): the owner's on/off per feature.
// GET  /api/features -> { plan, features: [{ feature, plan, included, enabled }] }
// PUT  /api/features { features: { <feature>: boolean } } -> same view; only the keys sent change.
// Turning on a feature outside the plan answers 422 `feature_not_in_plan` and saves nothing.

export const FEATURES_PATH = '/api/features';
const ENTITY = 'features';
const NOT_IN_PLAN = 'feature_not_in_plan';

const featureKey = z.enum(FEATURES as [Feature, ...Feature[]]);
const bodySchema = z
  .object({
    features: z
      .partialRecord(featureKey, z.boolean())
      .refine((choices) => Object.keys(choices).length > 0),
  })
  .strict();

export function registerFeatureRoutes(app: FastifyInstance): void {
  const guard = { preHandler: requireTenant(Permission.featuresManage) };
  app.get(FEATURES_PATH, guard, read);
  app.put(FEATURES_PATH, guard, save);
}

async function viewOf(tx: Tx, tenantId: string) {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { plan: true },
  });
  return { plan: PlanId[tenant.plan], features: await readFeatures(tx, tenantId) };
}

async function read(request: FastifyRequest) {
  const tenant = tenantOf(request);
  return tenant.withTenant((tx) => viewOf(tx, tenant.tenantId));
}

const entriesOf = (choices: FeatureChoices) =>
  FEATURES.flatMap((feature) => {
    const enabled = choices[feature];
    return enabled === undefined ? [] : [{ feature, enabled }];
  });

async function save(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const entries = entriesOf(body.features);
  return tenant.withTenant(async (tx) => {
    const before = await viewOf(tx, tenant.tenantId);
    if (entries.some(({ feature, enabled }) => enabled && !planIncludes(before.plan, feature)))
      return reply.code(HttpStatus.unprocessable).send({ error: NOT_IN_PLAN });
    for (const { feature, enabled } of entries)
      await tx.featureSetting.upsert({
        where: { tenantId_feature: { tenantId: tenant.tenantId, feature } },
        create: { tenantId: tenant.tenantId, feature, enabled },
        update: { enabled },
      });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: tenant.tenantId,
      action: AuditAction.update,
      before: before.features.map(({ feature, enabled }) => ({ feature, enabled })),
      after: body.features,
    });
    return viewOf(tx, tenant.tenantId);
  });
}
