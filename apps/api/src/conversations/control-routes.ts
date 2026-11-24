import { ActorType, ControlReason, ConversationControl, setControl } from '@app/db';
import type { FastifyInstance } from 'fastify';
import * as z from 'zod';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';

export const CONTROL_PATH = '/api/conversations/:id/control';

const paramsSchema = z.object({ id: z.uuid() });
const bodySchema = z.object({ to: z.enum(ConversationControl) });

/** Panel buttons "Assumir" and "Devolver ao assistente" (spec 10; RF-32, RF-34). Any member. */
export function registerControlRoutes(app: FastifyInstance): void {
  app.post(CONTROL_PATH, { preHandler: requireTenant() }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const body = bodySchema.safeParse(request.body);
    const tenant = request.tenant;
    if (!params.success || !body.success || !tenant)
      return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
    const conversationId = params.data.id;
    const changed = await tenant.withTenant(async (tx) => {
      // RLS: another tenant's conversation is simply not found.
      const exists = await tx.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true },
      });
      if (!exists) return null;
      return setControl(tx, {
        tenantId: tenant.tenantId,
        conversationId,
        to: body.data.to,
        reason: ControlReason.dashboard,
        actor: { type: ActorType.user, id: tenant.userId },
      });
    });
    if (changed === null)
      return reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
    return reply.code(HttpStatus.ok).send({ control: body.data.to, changed });
  });
}
