import { AgendaError, Attendance, markAttendance } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, parsed } from '../setup/guarded.ts';
import { idParams } from './schemas.ts';

// Spec 05/10: the owner marks "compareceu" or "faltou" once the time has come.

const PATH = '/api/agenda/appointments/:id/attendance';
const ENTITY = 'appointment';
const bodySchema = z.object({ outcome: z.enum(Attendance) }).strict();

export function registerAttendanceRoute(app: FastifyInstance): void {
  app.post(PATH, { preHandler: requireTenant(Permission.agendaBook) }, mark);
}

async function mark(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  const result = await markAttendance(request.server.db, {
    tenantId: tenant.tenantId,
    appointmentId: params.data.id,
    outcome: body.outcome,
    now: new Date(),
  });
  if (!result.ok) {
    if (result.error === AgendaError.appointmentNotFound) return notFound(reply);
    return reply.code(HttpStatus.conflict).send({ error: result.error });
  }
  await tenant.withTenant((tx) =>
    audit(tx, tenant, {
      entity: ENTITY,
      entityId: result.value.id,
      action: AuditAction.update,
      after: { attendance: body.outcome },
    }),
  );
  return { id: result.value.id, status: result.value.status };
}
