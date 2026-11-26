import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { tenantOf } from '../setup/guarded.ts';

// S-07 (RF-91): what the panel needs to open a support chat with account context.
// Never patient data: only the tenant's short id, plan and status.

const PATH = '/api/support';
const SHORT_ID_LENGTH = 8;

export interface SupportChannels {
  /** Support WhatsApp number, digits only. Unset hides the WhatsApp option. */
  whatsapp: string | undefined;
  email: string | undefined;
}

export function registerSupportRoutes(app: FastifyInstance, channels: SupportChannels): void {
  app.get(PATH, { preHandler: requireTenant(Permission.assistantRead) }, (request) =>
    readSupport(request, channels),
  );
}

async function readSupport(request: FastifyRequest, channels: SupportChannels) {
  const tenant = tenantOf(request);
  const { plan, status } = await tenant.withTenant((tx) =>
    tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: { plan: true, status: true },
    }),
  );
  return {
    whatsapp: channels.whatsapp ?? null,
    email: channels.email ?? null,
    context: { tenant: tenant.tenantId.slice(0, SHORT_ID_LENGTH), plan, status },
  };
}
