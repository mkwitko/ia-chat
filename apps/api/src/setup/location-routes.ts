import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { audit, AuditAction } from './audit.ts';
import { parsed, tenantOf } from './guarded.ts';

// Spec 10, "Serviços e local": one address and arrival instructions (free text, RF-05).

const PATH = '/api/location';
const ENTITY = 'location';
const DEFAULT_NAME = 'Consultório';
const MAX_ADDRESS = 300;
const MAX_ARRIVAL = 1000;
const SELECT = { address: true, arrivalInstructions: true } as const;

const bodySchema = z
  .object({
    address: z.string().trim().min(1).max(MAX_ADDRESS),
    arrivalInstructions: z.string().trim().max(MAX_ARRIVAL).nullable(),
  })
  .strict();

export function registerLocationRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant(Permission.assistantRead) }, readLocation);
  app.put(PATH, { preHandler: requireTenant(Permission.assistantManage) }, saveLocation);
}

async function readLocation(request: FastifyRequest) {
  const location = await tenantOf(request).withTenant((tx) =>
    tx.location.findFirst({ orderBy: { createdAt: 'asc' }, select: SELECT }),
  );
  return { location };
}

async function saveLocation(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const data = {
    ...body,
    arrivalInstructions: body.arrivalInstructions?.length ? body.arrivalInstructions : null,
  };
  const location = await tenant.withTenant(async (tx) => {
    // The agent reads the first location (apps/worker context); the panel edits that one.
    const current = await tx.location.findFirst({ orderBy: { createdAt: 'asc' } });
    const after = current
      ? await tx.location.update({
          where: { id: current.id },
          data,
          select: { id: true, ...SELECT },
        })
      : await tx.location.create({
          data: { ...data, tenantId: tenant.tenantId, name: DEFAULT_NAME },
          select: { id: true, ...SELECT },
        });
    const before = current && {
      address: current.address,
      arrivalInstructions: current.arrivalInstructions,
    };
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: after.id,
      action: current ? AuditAction.update : AuditAction.create,
      ...(before ? { before } : {}),
      after: data,
    });
    return { address: after.address, arrivalInstructions: after.arrivalInstructions };
  });
  return { location };
}
