import {
  LEAD_FOLLOW_UP_DEFAULT_DAYS,
  LEAD_FOLLOW_UP_DEFAULT_TEXT,
  LEAD_FOLLOW_UP_MAX_DAYS,
  LEAD_FOLLOW_UP_MAX_TEXT,
  LEAD_FOLLOW_UP_MIN_DAYS,
} from '@app/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';

// M-10: the owner's switch, wait and approved text for the lead follow-up. Saving a text is
// approving it; the switch only turns on with an approved text (nothing goes out otherwise).

const PATH = '/api/growth/lead-follow-up';
const ENTITY = 'lead_follow_up';
const SELECT = { leadFollowUp: true, leadFollowUpDays: true, leadFollowUpText: true } as const;

const bodySchema = z
  .object({
    enabled: z.boolean(),
    days: z.int().min(LEAD_FOLLOW_UP_MIN_DAYS).max(LEAD_FOLLOW_UP_MAX_DAYS),
    /** The text the owner read and approved. */
    text: z.string().trim().min(1).max(LEAD_FOLLOW_UP_MAX_TEXT),
  })
  .strict();

interface Row {
  leadFollowUp: boolean;
  leadFollowUpDays: number;
  leadFollowUpText: string | null;
}

const viewOf = (row: Row) => ({
  enabled: row.leadFollowUp,
  days: row.leadFollowUpDays,
  /** Null until the owner approves one. */
  text: row.leadFollowUpText,
  defaultText: LEAD_FOLLOW_UP_DEFAULT_TEXT,
  defaultDays: LEAD_FOLLOW_UP_DEFAULT_DAYS,
});

export function registerLeadFollowUpRoutes(app: FastifyInstance): void {
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
    const after = await tx.tenant.update({
      where: { id: tenant.tenantId },
      data: {
        leadFollowUp: body.enabled,
        leadFollowUpDays: body.days,
        leadFollowUpText: body.text,
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
