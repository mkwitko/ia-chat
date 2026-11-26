import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';

// Research 09 #2: the Monday report (e-mail and push) is on by default; "Mais" turns it off.

const PATH = '/api/notifications/weekly-report';
const ENTITY = 'tenant_notifications';
const bodySchema = z.object({ enabled: z.boolean() }).strict();

export function registerReportRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant() }, read);
  app.put(PATH, { preHandler: requireTenant(Permission.assistantManage) }, save);
}

function read(request: FastifyRequest) {
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    const row = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: { weeklyReport: true },
    });
    return { enabled: row.weeklyReport };
  });
}

async function save(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    await tx.tenant.update({
      where: { id: tenant.tenantId },
      data: { weeklyReport: body.enabled },
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: tenant.tenantId,
      action: AuditAction.update,
      after: { weeklyReport: body.enabled },
    });
    return { enabled: body.enabled };
  });
}
