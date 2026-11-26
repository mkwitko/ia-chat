import { DepositOutcome, confirmDeposit, listPendingDeposits } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, tenantOf } from '../setup/guarded.ts';
import { registerDepositSettingsRoutes } from './deposit-settings-routes.ts';

// H-52: the deposits waiting for the professional, and the one tap that says the money arrived.
// GET  /api/deposits -> [{ id, amountCents, expiresAt, startsAt, serviceName, contactId, contactName }]
// POST /api/deposits/:id/confirm -> { status: 'confirmed' } | 404 | 409 deposit_expired

export const DEPOSITS_PATH = '/api/deposits';
const CONFIRM_PATH = `${DEPOSITS_PATH}/:id/confirm`;
const ENTITY = 'payment';
const params = z.object({ id: z.uuid() });

export function registerDepositRoutes(app: FastifyInstance): void {
  app.get(DEPOSITS_PATH, { preHandler: requireTenant(Permission.agendaRead) }, list);
  app.post(CONFIRM_PATH, { preHandler: requireTenant(Permission.agendaBook) }, confirm);
  registerDepositSettingsRoutes(app);
}

async function list(request: FastifyRequest) {
  const tenant = tenantOf(request);
  const rows = await tenant.withTenant(listPendingDeposits);
  return rows.flatMap(({ appointment, ...payment }) =>
    appointment
      ? [
          {
            ...payment,
            startsAt: appointment.startsAt,
            serviceName: appointment.service.name,
            contactId: appointment.contactId,
            contactName: appointment.contact.name ?? appointment.contact.phoneE164,
          },
        ]
      : [],
  );
}

async function confirm(request: FastifyRequest, reply: FastifyReply) {
  const tenant = tenantOf(request);
  const parsedParams = params.safeParse(request.params);
  if (!parsedParams.success) return notFound(reply);
  const paymentId = parsedParams.data.id;
  const outcome = await confirmDeposit(request.server.db, {
    tenantId: tenant.tenantId,
    paymentId,
    now: new Date(),
  });
  if (outcome === DepositOutcome.notFound) return notFound(reply);
  if (outcome === DepositOutcome.expired)
    return reply.code(HttpStatus.conflict).send({ error: outcome });
  await tenant.withTenant((tx) =>
    audit(tx, tenant, {
      entity: ENTITY,
      entityId: paymentId,
      action: AuditAction.update,
      after: { status: outcome },
    }),
  );
  return { status: outcome };
}
