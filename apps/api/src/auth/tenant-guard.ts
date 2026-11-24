import type { Tx } from '@app/db';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
import { ErrorCode, HttpStatus } from '../http.ts';
import { isRole, roles, type PermissionRequest, type Role } from './access.ts';

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: Role;
  /** Runs fn inside withTenant for this request's tenant (RN-01). */
  withTenant<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext;
  }
}

/**
 * preHandler: resolves user, active tenant and role, checks membership in the database
 * (not only the session) and the permission, then exposes request.tenant.
 */
export function requireTenant(permission?: PermissionRequest): preHandlerAsyncHookHandler {
  return async function tenantGuard(request, reply) {
    const { auth, db } = request.server;
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) return deny(reply, HttpStatus.unauthorized, ErrorCode.noSession);

    const tenantId = session.session.activeOrganizationId;
    if (!tenantId) return deny(reply, HttpStatus.forbidden, ErrorCode.noActiveTenant);

    const userId = session.user.id;
    const membership = await db.client.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!membership || !isRole(membership.role)) {
      return deny(reply, HttpStatus.forbidden, ErrorCode.notAMember);
    }
    const role = membership.role;
    if (permission && !roles[role].authorize(permission).success) {
      return deny(reply, HttpStatus.forbidden, ErrorCode.forbidden);
    }
    request.tenant = { tenantId, userId, role, withTenant: (fn) => db.withTenant(tenantId, fn) };
  };
}

function deny(reply: FastifyReply, status: number, error: ErrorCode): FastifyReply {
  return reply.status(status).send({ error });
}
