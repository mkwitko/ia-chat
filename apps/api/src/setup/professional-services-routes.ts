import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from './audit.ts';
import { notFound, parsed, tenantOf } from './guarded.ts';

// Spec 05, "Agenda por profissional": the services a professional performs. An empty list means
// every service (H-45), so a one-professional tenant never has to set it.

const PATH = '/api/professionals/:id/services';
const ENTITY = 'professional_services';
const MAX_SERVICES = 100;

const idParams = z.object({ id: z.uuid() });
const bodySchema = z
  .object({ serviceIds: z.array(z.uuid()).max(MAX_SERVICES) })
  .strict()
  .refine((body) => new Set(body.serviceIds).size === body.serviceIds.length);

export function registerProfessionalServiceRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant(Permission.agendaRead) }, readServices);
  app.put(PATH, { preHandler: requireTenant(Permission.agendaManage) }, replaceServices);
}

function readServices(request: FastifyRequest, reply: FastifyReply) {
  const params = idParams.safeParse(request.params);
  if (!params.success) return notFound(reply);
  return tenantOf(request).withTenant(async (tx) => {
    const professional = await tx.professional.findUnique({ where: { id: params.data.id } });
    if (!professional) return notFound(reply);
    const links = await tx.professionalService.findMany({
      where: { professionalId: professional.id },
      select: { serviceId: true },
    });
    return { serviceIds: links.map((link) => link.serviceId) };
  });
}

async function replaceServices(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  return tenant.withTenant(async (tx) => {
    const professional = await tx.professional.findUnique({ where: { id: params.data.id } });
    if (!professional) return notFound(reply);
    const known = await tx.service.count({ where: { id: { in: body.serviceIds } } });
    if (known !== body.serviceIds.length)
      return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
    const mine = { professionalId: professional.id };
    const before = await tx.professionalService.count({ where: mine });
    await tx.professionalService.deleteMany({ where: mine });
    await tx.professionalService.createMany({
      data: body.serviceIds.map((serviceId) => ({
        tenantId: tenant.tenantId,
        professionalId: professional.id,
        serviceId,
      })),
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: professional.id,
      action: AuditAction.update,
      before: { services: before },
      after: { services: body.serviceIds.length },
    });
    return { serviceIds: body.serviceIds };
  });
}
