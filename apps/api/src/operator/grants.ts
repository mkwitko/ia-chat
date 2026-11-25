import { ActorType, type Prisma, type Tx } from '@app/db';
import * as z from 'zod';

// RN-35: an operator reads a tenant only inside an active grant (reason + deadline). The grant is
// an audit_log row of the tenant, so the owner sees it and nobody can rewrite it (append-only, RN-07).

export const OperatorAction = {
  accessGranted: 'operator.access_granted',
  tenantRead: 'operator.tenant_read',
} as const;
export const OPERATOR_ENTITY = 'operator_access';

export const MAX_GRANT_HOURS = 24;
const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;
const MS_PER_HOUR = 3_600_000;
const RECENT_GRANTS = 20;

export const grantSchema = z
  .object({
    reason: z.string().trim().min(MIN_REASON_LENGTH).max(MAX_REASON_LENGTH),
    hours: z.int().min(1).max(MAX_GRANT_HOURS),
  })
  .strict();
export type GrantInput = z.infer<typeof grantSchema>;

const grantDetails = z.object({ reason: z.string(), expiresAt: z.iso.datetime() });

export interface Grant {
  operatorId: string;
  reason: string;
  grantedAt: Date;
  expiresAt: Date;
}

export interface GrantRequest {
  tenantId: string;
  operatorId: string;
  input: GrantInput;
  now: Date;
}

export async function createGrant(tx: Tx, request: GrantRequest): Promise<Grant> {
  const { tenantId, operatorId, input, now } = request;
  const expiresAt = new Date(now.getTime() + input.hours * MS_PER_HOUR);
  await auditOperator(tx, {
    tenantId,
    operatorId,
    action: OperatorAction.accessGranted,
    details: { reason: input.reason, expiresAt: expiresAt.toISOString() },
  });
  return { operatorId, reason: input.reason, grantedAt: now, expiresAt };
}

/** Recent grants of the tenant, newest first (the owner's view and the operator's check). */
export async function recentGrants(tx: Tx): Promise<Grant[]> {
  const rows = await tx.auditLog.findMany({
    where: { action: OperatorAction.accessGranted },
    orderBy: { createdAt: 'desc' },
    take: RECENT_GRANTS,
  });
  return rows.flatMap((row) => {
    const details = grantDetails.safeParse(row.after);
    if (!details.success || !row.actorId) return [];
    const { reason, expiresAt } = details.data;
    const grantedAt = row.createdAt;
    return [{ operatorId: row.actorId, reason, grantedAt, expiresAt: new Date(expiresAt) }];
  });
}

/** The grant that lets this operator read now, or null (none, or expired). */
export async function activeGrant(tx: Tx, operatorId: string, now: Date): Promise<Grant | null> {
  const grants = await recentGrants(tx);
  return grants.find((g) => g.operatorId === operatorId && g.expiresAt > now) ?? null;
}

export interface OperatorAudit {
  tenantId: string;
  operatorId: string;
  action: string;
  details: Prisma.InputJsonValue;
}

export function auditOperator(tx: Tx, entry: OperatorAudit) {
  return tx.auditLog.create({
    data: {
      tenantId: entry.tenantId,
      actorType: ActorType.operator,
      actorId: entry.operatorId,
      action: entry.action,
      entity: OPERATOR_ENTITY,
      after: entry.details,
    },
  });
}
