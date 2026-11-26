import { removeWaitlistEntry, waitlistBetween, type Tx } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, tenantOf } from '../setup/guarded.ts';
import { idParams } from './schemas.ts';

// M-09 (spec 10, "Agenda"): the waitlist shows per day in the agenda; the owner can take a
// client off it. Entries come from the assistant (entrar_lista_de_espera), never from here.

const ITEM_PATH = '/api/agenda/waitlist/:id';
const ENTITY = 'waitlist_entry';

export function registerWaitlistRoutes(app: FastifyInstance): void {
  app.delete(ITEM_PATH, { preHandler: requireTenant(Permission.agendaBook) }, removeOne);
}

/** What the agenda view adds to its range: who waits for which service, and between when. */
export async function waitlistView(tx: Tx, range: { start: Date; end: Date }) {
  const rows = await waitlistBetween(tx, range);
  return rows.map((row) => ({
    id: row.id,
    serviceName: row.service.name,
    patientName: row.contact.name,
    patientPhone: row.contact.phoneE164,
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
  }));
}

async function removeOne(request: FastifyRequest, reply: FastifyReply) {
  const params = idParams.safeParse(request.params);
  if (!params.success) return notFound(reply);
  const tenant = tenantOf(request);
  const removed = await tenant.withTenant(async (tx) => {
    const done = await removeWaitlistEntry(tx, params.data.id);
    if (done)
      await audit(tx, tenant, {
        entity: ENTITY,
        entityId: params.data.id,
        action: AuditAction.archive,
      });
    return done;
  });
  if (!removed) return notFound(reply);
  return { id: params.data.id };
}
