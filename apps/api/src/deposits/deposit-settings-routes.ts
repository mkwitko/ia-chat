import { Feature, MAX_HOLD_MINUTES, MIN_HOLD_MINUTES, normalizePixKey } from '@app/core';
import { readFeatures, type Tx } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';

// H-52: the professional's Pix key and the deposit of each service (spec 05, "Sinal via Pix").
// Where the patient's money goes is the owner's, like billing (H-10).
// GET -> { settings | null, services: [{ id, name, priceCents, depositCents }], feature }
// PUT { pixKey, receiverName, city, holdMinutes, refundPolicy?, services: [{ id, depositCents }] }

export const DEPOSIT_SETTINGS_PATH = '/api/deposits/settings';
const ENTITY = 'deposit_settings';
const INVALID_KEY = 'invalid_pix_key';
const MAX_NAME = 60;
const MAX_CITY = 40;
const MAX_POLICY = 500;
const MAX_DEPOSIT_CENTS = 1_000_000;

const bodySchema = z
  .object({
    pixKey: z.string().trim().min(1),
    receiverName: z.string().trim().min(1).max(MAX_NAME),
    city: z.string().trim().min(1).max(MAX_CITY),
    holdMinutes: z.int().min(MIN_HOLD_MINUTES).max(MAX_HOLD_MINUTES),
    refundPolicy: z.string().trim().max(MAX_POLICY).nullable().optional(),
    services: z.array(
      z.object({ id: z.uuid(), depositCents: z.int().min(1).max(MAX_DEPOSIT_CENTS).nullable() }),
    ),
  })
  .strict();

export function registerDepositSettingsRoutes(app: FastifyInstance): void {
  app.get(DEPOSIT_SETTINGS_PATH, { preHandler: requireTenant(Permission.billingRead) }, read);
  app.put(DEPOSIT_SETTINGS_PATH, { preHandler: requireTenant(Permission.billingManage) }, save);
}

async function viewOf(tx: Tx, tenantId: string) {
  const settings = await tx.depositSettings.findUnique({
    where: { tenantId },
    select: { pixKey: true, receiverName: true, city: true, holdMinutes: true, refundPolicy: true },
  });
  const services = await tx.service.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, priceCents: true, depositCents: true },
  });
  const features = await readFeatures(tx, tenantId);
  const feature = features.find((state) => state.feature === Feature.pixDeposit);
  return { settings, services, feature };
}

async function read(request: FastifyRequest) {
  const tenant = tenantOf(request);
  return tenant.withTenant((tx) => viewOf(tx, tenant.tenantId));
}

async function save(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bodySchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const pixKey = normalizePixKey(body.pixKey);
  if (!pixKey) return reply.code(HttpStatus.unprocessable).send({ error: INVALID_KEY });
  const { tenantId } = tenant;
  const data = {
    pixKey,
    receiverName: body.receiverName,
    city: body.city,
    holdMinutes: body.holdMinutes,
    refundPolicy: body.refundPolicy ?? null,
  };
  return tenant.withTenant(async (tx) => {
    const before = await tx.depositSettings.findUnique({ where: { tenantId } });
    await tx.depositSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
    for (const service of body.services)
      await tx.service.updateMany({
        where: { id: service.id },
        data: { depositCents: service.depositCents },
      });
    // The key is the professional's own payment data: kept out of the audit trail.
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: tenantId,
      action: before ? AuditAction.update : AuditAction.create,
      after: { holdMinutes: body.holdMinutes, services: body.services },
    });
    return viewOf(tx, tenantId);
  });
}
