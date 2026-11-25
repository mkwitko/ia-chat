import { isValidDocument, normalizeDocument, trialView } from '@app/core';
import { Prisma } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';

// S-05 (spec 09, RF-80 to RF-88): the owner's view of the 14-day trial, and the one-trial-per-document limit.

const PATH = '/api/trial';
const DOCUMENT_PATH = '/api/trial/document';
const UNIQUE_VIOLATION = 'P2002';
const MAX_DOCUMENT_INPUT = 32;
const documentBody = z.object({ document: z.string().max(MAX_DOCUMENT_INPUT) }).strict();

export function registerTrialRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant(Permission.assistantRead) }, readTrial);
  app.put(DOCUMENT_PATH, { preHandler: requireTenant(Permission.billingManage) }, saveDocument);
}

function readTrial(request: FastifyRequest) {
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    const row = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: { status: true, trialEndsAt: true, trialEndedAt: true, document: true },
    });
    return { ...trialView({ ...row, now: new Date() }), documentSet: row.document !== null };
  });
}

/** RF-81: a CPF or CNPJ starts one trial only; a second tenant with the same document gets 409. */
async function saveDocument(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, documentBody);
  if (!input) return reply;
  if (!isValidDocument(input.body.document))
    return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
  const { tenant, body } = input;
  try {
    await tenant.withTenant((tx) =>
      tx.tenant.update({
        where: { id: tenant.tenantId },
        data: { document: normalizeDocument(body.document) },
      }),
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION)
      return reply.code(HttpStatus.conflict).send({ error: ErrorCode.documentTaken });
    throw error;
  }
  return reply.code(HttpStatus.ok).send({ ok: true });
}
