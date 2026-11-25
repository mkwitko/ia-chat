import { AlertEvent } from '@app/observability';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ErrorCode, HttpStatus } from '../http.ts';

export const fail = (reply: FastifyReply, status: number, error: ErrorCode) =>
  reply.code(status).send({ error });

/** The provider said no or was unreachable: nothing changed on our side; the owner may retry. */
export function providerFailed(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  request.server.alert(
    AlertEvent.jobFailed,
    {
      ...(request.tenant ? { tenantId: request.tenant.tenantId } : {}),
      code: ErrorCode.billingFailed,
    },
    error,
  );
  return fail(reply, HttpStatus.badGateway, ErrorCode.billingFailed);
}
