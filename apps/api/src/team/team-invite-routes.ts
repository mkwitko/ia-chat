import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { ErrorCode, HttpStatus } from '../http.ts';

// Spec 10, "Mais > Equipe": the page behind the e-mailed link (/convite-equipe/:id) reads what
// the invitation is for before the person signs up or in. Inviting, resending, revoking, role
// changes and removal are Better Auth's organization endpoints, guarded by access.ts.

const PATH = '/api/team-invites/:id';
const PENDING = 'pending';
const EXPIRED = 'expired';
const params = z.object({ id: z.uuid() });

export interface PublicTeamInvite {
  /** Better Auth's status (pending, accepted, canceled, rejected) or `expired`. */
  state: string;
  practiceName: string;
  email: string;
  role: string;
}

export function registerTeamInviteRoutes(app: FastifyInstance): void {
  app.get(PATH, readPublic);
}

async function readPublic(request: FastifyRequest, reply: FastifyReply) {
  const id = params.safeParse(request.params);
  if (!id.success) return notFound(reply);
  const found = await request.server.db.client.invitation.findUnique({
    where: { id: id.data.id },
    select: {
      status: true,
      expiresAt: true,
      email: true,
      role: true,
      tenant: { select: { name: true } },
    },
  });
  if (!found) return notFound(reply);
  const expired = found.status === PENDING && found.expiresAt <= new Date();
  return {
    state: expired ? EXPIRED : found.status,
    practiceName: found.tenant.name,
    email: found.email,
    role: found.role,
  } satisfies PublicTeamInvite;
}

const notFound = (reply: FastifyReply) =>
  reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
