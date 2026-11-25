import { recentOpsEvents } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { notFound, tenantOf } from '../setup/guarded.ts';
import {
  activeGrant,
  auditOperator,
  createGrant,
  grantSchema,
  OperatorAction,
  recentGrants,
} from './grants.ts';
import { requireOperator } from './operator-guard.ts';
import { funnelOf } from './funnel.ts';
import { clientRows } from './overview.ts';
import { tenantConversations } from './tenant-conversations.ts';

const BASE = '/api/operator';
const OWNER_VIEW = '/api/operator-access';
const GUARD_MISSING = 'operator guard missing';
const paramsSchema = z.object({ tenantId: z.uuid() });

/** E-27: platform operator area (guarded by OPERATOR_EMAILS) and the tenant owner's view of grants. */
export function registerOperatorRoutes(app: FastifyInstance): void {
  const preHandler = requireOperator;
  app.get(`${BASE}/me`, { preHandler }, () => ({ operator: true }));
  app.get(`${BASE}/clients`, { preHandler }, listClients);
  app.get(`${BASE}/funnel`, { preHandler }, (request) => funnelOf(request.server.db));
  app.get(`${BASE}/problems`, { preHandler }, (request) => recentOpsEvents(request.server.db));
  app.post(`${BASE}/tenants/:tenantId/access`, { preHandler }, grantAccess);
  app.get(`${BASE}/tenants/:tenantId/conversations`, { preHandler }, readConversations);
  app.get(OWNER_VIEW, { preHandler: requireTenant(Permission.billingManage) }, ownerView);
}

/** All clients, or one with `?tenantId=` (a quick refresh of a single row). */
function listClients(request: FastifyRequest) {
  const { tenantId } = z.object({ tenantId: z.uuid().optional() }).parse(request.query);
  return clientRows(request.server.db, new Date(), tenantId);
}

function operatorOf(request: FastifyRequest) {
  // requireOperator runs first; reaching here without it is a wiring bug.
  if (!request.operator) throw new Error(GUARD_MISSING);
  return request.operator;
}

function invalid(reply: FastifyReply) {
  return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
}

async function grantAccess(request: FastifyRequest, reply: FastifyReply) {
  const params = paramsSchema.safeParse(request.params);
  const input = grantSchema.safeParse(request.body);
  if (!params.success || !input.success) return invalid(reply);
  const { tenantId } = params.data;
  const { db } = request.server;
  if (!(await db.client.tenant.findUnique({ where: { id: tenantId } }))) return notFound(reply);
  const operatorId = operatorOf(request).userId;
  return db.withTenant(tenantId, (tx) =>
    createGrant(tx, { tenantId, operatorId, input: input.data, now: new Date() }),
  );
}

/** Needs an active grant; the read itself is audited in the tenant's log, still through withTenant. */
async function readConversations(request: FastifyRequest, reply: FastifyReply) {
  const params = paramsSchema.safeParse(request.params);
  if (!params.success) return invalid(reply);
  const { tenantId } = params.data;
  const operatorId = operatorOf(request).userId;
  const now = new Date();
  return request.server.db.withTenant(tenantId, async (tx) => {
    if (!(await activeGrant(tx, operatorId, now))) {
      return reply.code(HttpStatus.forbidden).send({ error: ErrorCode.noGrant });
    }
    await auditOperator(tx, {
      tenantId,
      operatorId,
      action: OperatorAction.tenantRead,
      details: { resource: 'conversations' },
    });
    return tenantConversations(tx, now);
  });
}

/** What the tenant's owner sees: who asked to look, why, and until when (RN-35). */
async function ownerView(request: FastifyRequest) {
  const grants = await tenantOf(request).withTenant(recentGrants);
  const users = await request.server.db.client.user.findMany({
    where: { id: { in: grants.map((g) => g.operatorId) } },
    select: { id: true, email: true },
  });
  return grants.map(({ operatorId, ...grant }) => ({
    ...grant,
    operatorEmail: users.find((u) => u.id === operatorId)?.email ?? null,
  }));
}
