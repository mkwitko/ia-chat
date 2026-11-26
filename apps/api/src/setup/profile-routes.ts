import { businessProfileSchema, parseBusinessProfile } from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { audit, AuditAction } from './audit.ts';
import { parsed, tenantOf } from './guarded.ts';

// M-04 (spec 11): the business profile. Name, the cancellation minutes and the no-show switch
// (M-09) live on the tenant; the rest is one validated JSON column the assistant reads
// (packages with prices in cents).

const PATH = '/api/profile';
const ENTITY = 'business_profile';
const MAX_NAME = 120;
const MAX_NOTICE_MINUTES = 10_080; // a week
const SELECT = {
  name: true,
  cancelNoticeMinutes: true,
  noShowFollowUp: true,
  businessProfile: true,
} as const;

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_NAME),
    cancelNoticeMinutes: z.int().min(0).max(MAX_NOTICE_MINUTES),
    /** M-09: ask the client when to reschedule after a "faltou" (absent: unchanged). */
    noShowFollowUp: z.boolean().optional(),
    profile: businessProfileSchema,
  })
  .strict();

interface ProfileRow {
  name: string;
  cancelNoticeMinutes: number;
  noShowFollowUp: boolean;
  businessProfile: unknown;
}

const viewOf = (row: ProfileRow) => ({
  name: row.name,
  cancelNoticeMinutes: row.cancelNoticeMinutes,
  noShowFollowUp: row.noShowFollowUp,
  profile: parseBusinessProfile(row.businessProfile),
});

export function registerProfileRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant(Permission.assistantRead) }, readProfile);
  app.put(PATH, { preHandler: requireTenant(Permission.assistantManage) }, saveProfile);
}

async function readProfile(request: FastifyRequest) {
  const tenant = tenantOf(request);
  const row = await tenant.withTenant((tx) =>
    tx.tenant.findUniqueOrThrow({ where: { id: tenant.tenantId }, select: SELECT }),
  );
  return viewOf(row);
}

async function saveProfile(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    const before = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: SELECT,
    });
    const after = await tx.tenant.update({
      where: { id: tenant.tenantId },
      data: {
        name: body.name,
        cancelNoticeMinutes: body.cancelNoticeMinutes,
        ...(body.noShowFollowUp === undefined ? {} : { noShowFollowUp: body.noShowFollowUp }),
        businessProfile: body.profile,
      },
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
