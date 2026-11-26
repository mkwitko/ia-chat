import {
  REVIEW_DEFAULT_DELAY_HOURS,
  REVIEW_MAX_DELAY_HOURS,
  REVIEW_MIN_DELAY_HOURS,
  parseBusinessProfile,
} from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';

// M-12: the owner's switch and delay for the review request after "Compareceu". It only turns
// on with the Google review link filled in the business profile (M-04).

const PATH = '/api/growth/review-request';
const ENTITY = 'review_request';
const NO_LINK = 'review_link_missing';
const SELECT = {
  reviewRequest: true,
  reviewRequestDelayHours: true,
  businessProfile: true,
} as const;

const bodySchema = z
  .object({
    enabled: z.boolean(),
    delayHours: z.int().min(REVIEW_MIN_DELAY_HOURS).max(REVIEW_MAX_DELAY_HOURS),
  })
  .strict();

interface Row {
  reviewRequest: boolean;
  reviewRequestDelayHours: number;
  businessProfile: unknown;
}

const viewOf = (row: Row) => ({
  enabled: row.reviewRequest,
  delayHours: row.reviewRequestDelayHours,
  /** The link the message carries comes from the business profile; without it nothing is sent. */
  reviewLink: parseBusinessProfile(row.businessProfile).reviewLink ?? null,
  defaultDelayHours: REVIEW_DEFAULT_DELAY_HOURS,
});

export function registerReviewRequestRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant(Permission.assistantRead) }, read);
  app.put(PATH, { preHandler: requireTenant(Permission.assistantManage) }, save);
}

async function read(request: FastifyRequest) {
  const tenant = tenantOf(request);
  const row = await tenant.withTenant((tx) =>
    tx.tenant.findUniqueOrThrow({ where: { id: tenant.tenantId }, select: SELECT }),
  );
  return viewOf(row);
}

async function save(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    const before = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: SELECT,
    });
    if (body.enabled && !viewOf(before).reviewLink)
      return reply.code(HttpStatus.unprocessable).send({ error: NO_LINK });
    const after = await tx.tenant.update({
      where: { id: tenant.tenantId },
      data: { reviewRequest: body.enabled, reviewRequestDelayHours: body.delayHours },
      select: SELECT,
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: tenant.tenantId,
      action: AuditAction.update,
      before: viewOf(before),
      after: body,
    });
    return viewOf(after);
  });
}
