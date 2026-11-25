import { simulateTurn, SimRole } from '@app/agent';
import type { AiGateway } from '@app/ai';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { createTurnLimiter } from './turn-limiter.ts';

export const SIMULATOR_PATH = '/api/simulator';
/** ai_usage.task prefix of every simulator call. */
export const SIMULATOR_USAGE_PREFIX = 'simulator';

const MAX_MESSAGES = 40;
const MAX_TEXT = 1_000;

const bodySchema = z
  .object({
    messages: z
      .array(
        z.object({ role: z.enum(SimRole), text: z.string().trim().min(1).max(MAX_TEXT) }).strict(),
      )
      .min(1)
      .max(MAX_MESSAGES)
      .refine((messages) => messages.at(-1)?.role === SimRole.patient),
  })
  .strict();

/**
 * Spec 10, "Simulador": a test chat with the configured assistant. Reads the tenant's data,
 * writes no conversation or message, queues nothing and never reaches a channel; the only
 * write is the AI usage row (tagged `simulator:`). Without a gateway (no AI key) it is off.
 */
export function registerSimulatorRoutes(
  app: FastifyInstance,
  { gateway }: { gateway: AiGateway | undefined },
): void {
  const limiter = createTurnLimiter();
  app.post(
    SIMULATOR_PATH,
    { preHandler: requireTenant(Permission.assistantRead) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = bodySchema.safeParse(request.body);
      const tenant = request.tenant;
      if (!body.success || !tenant)
        return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
      if (!gateway)
        return reply.code(HttpStatus.unavailable).send({ error: ErrorCode.simulatorOff });
      if (!limiter.take(tenant.tenantId))
        return reply.code(HttpStatus.tooManyRequests).send({ error: ErrorCode.rateLimited });
      return simulateTurn(
        { db: request.server.db, gateway },
        { tenantId: tenant.tenantId, messages: body.data.messages },
      );
    },
  );
}
