import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { Period } from '../period.ts';
import { tenantOf } from '../setup/guarded.ts';
import { readResults } from './results-view.ts';

const PATH = '/api/results';
const query = z.object({ period: z.enum(Period).default(Period.month) });

/** Spec 10, "Resultados do mês": the pilot's numbers from real rows. Any member. */
export function registerResultsRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant() }, results);
}

function results(request: FastifyRequest, reply: FastifyReply) {
  const parsedQuery = query.safeParse(request.query);
  if (!parsedQuery.success)
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  const tenant = tenantOf(request);
  return tenant.withTenant((tx) =>
    readResults(tx, {
      tenantId: tenant.tenantId,
      period: parsedQuery.data.period,
      now: new Date(),
    }),
  );
}
