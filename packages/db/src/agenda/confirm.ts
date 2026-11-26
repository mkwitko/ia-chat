import { AppointmentStatus } from '../../generated/prisma/enums.ts';
import type { Db } from '../index.ts';
import { LIVE } from './guards.ts';
import { toView } from './view.ts';
import { AgendaError, type AgendaResult, type AppointmentView } from './types.ts';

export interface ConfirmRequest {
  tenantId: string;
  contactId: string;
  appointmentId: string;
  now: Date;
}

/**
 * RF-47: the patient answered "confirmar" to a reminder. Only a live future appointment of
 * this contact can be confirmed; confirming twice changes nothing.
 */
export async function confirmAppointment(
  db: Db,
  req: ConfirmRequest,
): Promise<AgendaResult<AppointmentView>> {
  return db.withTenant(req.tenantId, async (tx) => {
    const found = await tx.appointment.findFirst({
      where: {
        id: req.appointmentId,
        contactId: req.contactId,
        status: { in: LIVE },
        startsAt: { gt: req.now },
      },
      include: { service: true, professional: true },
    });
    if (!found) return { ok: false, error: AgendaError.appointmentNotFound } as const;
    const updated = await tx.appointment.update({
      where: { id: found.id },
      data: { status: AppointmentStatus.confirmed },
      include: { service: true, professional: true },
    });
    return { ok: true, value: toView(updated) } as const;
  });
}
