import { AppointmentStatus } from '../../generated/prisma/enums.ts';
import type { Db } from '../index.ts';
import type { AppointmentView } from './types.ts';
import { toView } from './view.ts';

const LIVE = [AppointmentStatus.scheduled, AppointmentStatus.confirmed];

export async function listUpcoming(
  db: Db,
  req: { tenantId: string; contactId: string; now: Date },
): Promise<AppointmentView[]> {
  const rows = await db.withTenant(req.tenantId, (tx) =>
    tx.appointment.findMany({
      where: { contactId: req.contactId, status: { in: LIVE }, startsAt: { gte: req.now } },
      include: { service: true, professional: true },
      orderBy: { startsAt: 'asc' },
    }),
  );
  return rows.map(toView);
}
