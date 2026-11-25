import type { FastifyReply, FastifyRequest } from 'fastify';
import type * as z from 'zod';
import type { TenantContext } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';

const GUARD_MISSING = 'tenant guard missing';

/** Body parsed by the schema plus the tenant, or the 400 already sent. */
export function parsed<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  schema: z.ZodType<T>,
): { tenant: TenantContext; body: T } | null {
  const body = schema.safeParse(request.body);
  if (!body.success || !request.tenant) {
    void reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
    return null;
  }
  return { tenant: request.tenant, body: body.data };
}

export function notFound(reply: FastifyReply) {
  return reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
}

export function tenantOf(request: FastifyRequest): TenantContext {
  const tenant = request.tenant;
  // requireTenant runs first; reaching here without it is a wiring bug.
  if (!tenant) throw new Error(GUARD_MISSING);
  return tenant;
}
