import type { AppointmentView } from './types.ts';

export function toView(row: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  calendarSync: AppointmentView['calendarSync'];
  service: { name: string };
}): AppointmentView {
  return {
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    serviceName: row.service.name,
    status: row.status,
    calendarSync: row.calendarSync,
  };
}
