import { CardList, Note, Section } from '../screens/section';
import { AttendanceButtons } from './attendance-buttons';
import { dayTimeLabel } from './customer-format';
import { CustomerCopy as Copy } from './customers-copy';
import { AppointmentStatusLabel, canMarkAttendance } from './customers-labels';
import { Outcome, type CustomerAppointment } from './customers-types';

const OUTCOME_BY_STATUS: Record<string, Outcome> = {
  completed: Outcome.attended,
  no_show: Outcome.noShow,
};

/** Appointments with the person; the ones already started can be marked present or absent. */
export function AppointmentsSection({
  appointments,
}: Readonly<{ appointments: readonly CustomerAppointment[] }>) {
  return (
    <Section title={Copy.appointmentsHeading}>
      {appointments.length === 0 && <Note>{Copy.appointmentsEmpty}</Note>}
      <CardList>
        {appointments.map((appointment) => (
          <li key={appointment.id} className="grid gap-2 px-4 py-3">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold tabular-nums">
                {dayTimeLabel(appointment.startsAt)}
              </span>
              <span className="text-sm text-muted-foreground">
                {AppointmentStatusLabel[appointment.status] ?? appointment.status}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">{appointment.serviceName}</span>
            {canMarkAttendance(appointment) && (
              <AttendanceButtons
                appointmentId={appointment.id}
                current={OUTCOME_BY_STATUS[appointment.status]}
              />
            )}
          </li>
        ))}
      </CardList>
    </Section>
  );
}
