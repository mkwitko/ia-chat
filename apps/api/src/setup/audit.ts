import { ActorType, type Prisma, type Tx } from '@app/db';
import type { TenantContext } from '../auth/tenant-guard.ts';

export const AuditAction = {
  create: 'create',
  update: 'update',
  archive: 'archive',
  /** A term the user accepted (RF-27). */
  accept: 'accept',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditEntry {
  entity: string;
  entityId: string;
  action: AuditAction;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

/** Every settings change leaves who, what, before and after (E-17, "Auditoria das alterações"). */
export function audit(tx: Tx, tenant: TenantContext, entry: AuditEntry) {
  return tx.auditLog.create({
    data: {
      tenantId: tenant.tenantId,
      actorType: ActorType.user,
      actorId: tenant.userId,
      ...entry,
    },
  });
}
