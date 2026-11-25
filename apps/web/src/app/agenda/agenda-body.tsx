import { CalendarDays } from 'lucide-react';
import { EmptyState } from '../screens/empty-state';
import { AgendaCopy as Copy } from './agenda-copy';
import { addDaysIso, dayOf, dayTitle, lastDayOf } from './agenda-dates';
import type { AgendaView, TimeOffItem } from './agenda-api';
import { AppointmentRow } from './appointment-row';
import type { BookingTarget } from './booking-form';
import { TimeOffNote } from './time-off-note';

interface BodyProps {
  agenda: AgendaView;
  days: number;
  onNew: (target: BookingTarget) => void;
}

/** One section per day; a single day shows the "empty" state with the next step (RN-53). */
export function AgendaBody({ agenda, days, onNew }: Readonly<BodyProps>) {
  const sections = Array.from({ length: days }, (_, index) => addDaysIso(agenda.from, index));
  if (days === 1 && agenda.appointments.length === 0 && agenda.timeOffs.length === 0)
    return <EmptyState icon={CalendarDays} {...Copy.emptyDay} />;
  return (
    <div className="grid gap-4 pb-10">
      {sections.map((day) => (
        <DaySection key={day} day={day} agenda={agenda} showTitle={days > 1} onNew={onNew} />
      ))}
    </div>
  );
}

const covers = (off: TimeOffItem, day: string, timezone: string) =>
  dayOf(off.startsAt, timezone) <= day && day <= lastDayOf(off.endsAt, timezone);

function DaySection({
  day,
  agenda,
  showTitle,
  onNew,
}: Readonly<{ day: string; agenda: AgendaView; showTitle: boolean; onNew: BodyProps['onNew'] }>) {
  const { timezone } = agenda;
  const items = agenda.appointments.filter((item) => dayOf(item.startsAt, timezone) === day);
  const offs = agenda.timeOffs.filter((off) => covers(off, day, timezone));
  return (
    <section aria-label={dayTitle(day)} className="grid gap-2">
      {showTitle && <h2 className="px-4 text-base capitalize md:px-0">{dayTitle(day)}</h2>}
      {offs.map((off) => (
        <TimeOffNote key={off.id} off={off} timezone={timezone} />
      ))}
      {items.length === 0 && showTitle && (
        <p className="px-4 text-sm text-muted-foreground md:px-0">{Copy.emptyWeek}</p>
      )}
      {items.length > 0 && (
        <ul className="divide-y border-y bg-card md:rounded-xl md:border">
          {items.map((item) => (
            <AppointmentRow key={item.id} item={item} timezone={timezone} onMove={onNew} />
          ))}
        </ul>
      )}
    </section>
  );
}
