import { PackageEntryReason } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';
import { contactPackages } from './balance.ts';

// Research 09 #7: "Compareceu" uses one session of the client's oldest package that still has
// one; a mark turned to "Faltou" gives it back. One appointment holds at most one session.

const USE = 1;
const GIVE_BACK = -1;

interface Debit {
  tenantId: string;
  contactId: string;
  appointmentId: string;
  attended: boolean;
}

/** Runs in the attendance transaction. The lock on the client's packages serialises two marks. */
export async function syncPackageDebit(tx: Tx, debit: Debit): Promise<void> {
  const { tenantId, contactId, appointmentId, attended } = debit;
  const locked = await tx.$queryRaw<{ id: string }[]>`
    select id from client_packages where contact_id = ${contactId}::uuid for update`;
  if (locked.length === 0) return;
  const held = await tx.packageEntry.groupBy({
    by: ['packageId'],
    where: { appointmentId },
    _sum: { delta: true },
  });
  const debited = held.find((row) => (row._sum.delta ?? 0) > 0);
  if (!attended) {
    if (!debited) return;
    await tx.packageEntry.create({
      data: {
        tenantId,
        packageId: debited.packageId,
        appointmentId,
        delta: GIVE_BACK,
        reason: PackageEntryReason.attendance_undone,
      },
    });
    return;
  }
  if (debited) return;
  const open = (await contactPackages(tx, contactId)).find((item) => item.remaining > 0);
  if (!open) return;
  await tx.packageEntry.create({
    data: {
      tenantId,
      packageId: open.id,
      appointmentId,
      delta: USE,
      reason: PackageEntryReason.attended,
    },
  });
}
