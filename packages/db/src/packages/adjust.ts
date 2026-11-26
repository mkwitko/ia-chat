import { PackageEntryReason } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';

// Research 09 #7: the owner moves a package's used count by one, with a reason from a short fixed
// list (never free text: spec 11, health data). The count stays between 0 and the package size.

export const PackageError = {
  notFound: 'pacote_nao_encontrado',
  belowZero: 'pacote_sem_sessao_usada',
  full: 'pacote_completo',
} as const;
export type PackageError = (typeof PackageError)[keyof typeof PackageError];

export const MANUAL_REASONS = [
  PackageEntryReason.correction,
  PackageEntryReason.courtesy,
  PackageEntryReason.outside_panel,
  PackageEntryReason.other,
] as const;
export type ManualReason = (typeof MANUAL_REASONS)[number];

export interface Adjustment {
  packageId: string;
  delta: 1 | -1;
  reason: ManualReason;
  actorId?: string;
}

export type AdjustResult = { ok: true; used: number } | { ok: false; error: PackageError };

export async function adjustPackage(tx: Tx, adjustment: Adjustment): Promise<AdjustResult> {
  const { packageId, delta, reason, actorId } = adjustment;
  const [pkg] = await tx.$queryRaw<{ tenant_id: string; sessions: number }[]>`
    select tenant_id, sessions from client_packages where id = ${packageId}::uuid for update`;
  if (!pkg) return { ok: false, error: PackageError.notFound };
  const sum = await tx.packageEntry.aggregate({ where: { packageId }, _sum: { delta: true } });
  const used = (sum._sum.delta ?? 0) + delta;
  if (used < 0) return { ok: false, error: PackageError.belowZero };
  if (used > pkg.sessions) return { ok: false, error: PackageError.full };
  await tx.packageEntry.create({
    data: { tenantId: pkg.tenant_id, packageId, delta, reason, actorId: actorId ?? null },
  });
  return { ok: true, used };
}
