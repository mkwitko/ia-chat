import { AppointmentStatus } from '../../generated/prisma/enums.ts';
import type { Db } from '../index.ts';
import { withStageSync } from '../customers/sync.ts';
import { AgendaError, AgendaFailure, type AgendaResult } from './types.ts';

// Spec 05 / spec 10: after the time, the owner marks "compareceu" or "faltou". It feeds the
// customer's stage and the no-show rate; no rate is ever computed without a mark.

export const Attendance = { attended: 'attended', noShow: 'no_show' } as const;
export type Attendance = (typeof Attendance)[keyof typeof Attendance];

const STATUS_OF: Readonly<Record<Attendance, AppointmentStatus>> = {
  [Attendance.attended]: AppointmentStatus.completed,
  [Attendance.noShow]: AppointmentStatus.no_show,
};
const MARKABLE: readonly AppointmentStatus[] = [
  AppointmentStatus.scheduled,
  AppointmentStatus.confirmed,
  AppointmentStatus.completed,
  AppointmentStatus.no_show,
];

export interface MarkRequest {
  tenantId: string;
  appointmentId: string;
  outcome: Attendance;
  now: Date;
}

/** A mark can be corrected (compareceu <-> faltou); a cancelled or future appointment cannot be marked. */
export async function markAttendance(
  db: Db,
  req: MarkRequest,
): Promise<AgendaResult<{ id: string; contactId: string; status: AppointmentStatus }>> {
  try {
    const value = await db.withTenant(req.tenantId, async (tx) => {
      const found = await tx.appointment.findFirst({ where: { id: req.appointmentId } });
      if (!found) throw new AgendaFailure(AgendaError.appointmentNotFound);
      if (!MARKABLE.includes(found.status)) throw new AgendaFailure(AgendaError.notMarkable);
      if (found.startsAt > req.now) throw new AgendaFailure(AgendaError.notStarted);
      const scope = { tenantId: req.tenantId, contactId: found.contactId, now: req.now };
      return withStageSync(tx, scope, () =>
        tx.appointment.update({
          where: { id: found.id },
          data: { status: STATUS_OF[req.outcome] },
          select: { id: true, contactId: true, status: true },
        }),
      );
    });
    return { ok: true, value };
  } catch (error) {
    if (error instanceof AgendaFailure) return { ok: false, error: error.code };
    throw error;
  }
}
