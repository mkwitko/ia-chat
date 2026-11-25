import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
import { ErrorCode, HttpStatus } from '../http.ts';

export interface OperatorContext {
  userId: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    operator?: OperatorContext;
  }
  interface FastifyInstance {
    /** Lowercase emails of the platform operators (OPERATOR_EMAILS, hypothesis H-20). */
    operatorEmails: readonly string[];
  }
}

/**
 * preHandler of /api/operator/*: the platform operator is a verified user whose email is in
 * OPERATOR_EMAILS. A tenant role never grants it.
 */
export const requireOperator: preHandlerAsyncHookHandler = async (request, reply) => {
  const { auth, operatorEmails } = request.server;
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session) return deny(reply, HttpStatus.unauthorized, ErrorCode.noSession);
  const { id, email, emailVerified } = session.user;
  if (!emailVerified || !operatorEmails.includes(email.toLowerCase())) {
    return deny(reply, HttpStatus.forbidden, ErrorCode.forbidden);
  }
  request.operator = { userId: id, email };
};

function deny(reply: FastifyReply, status: number, error: ErrorCode): FastifyReply {
  return reply.status(status).send({ error });
}
