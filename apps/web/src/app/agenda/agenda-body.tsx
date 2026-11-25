import { Button } from '@/components/ui/button';
import { EmptyState } from '../screens/empty-state';
import { AgendaCopy as Copy } from './agenda-copy';
import { addDaysIso, dayOf, dayTitle, lastDayOf } from './agenda-dates';
import type { AgendaView, TimeOffItem } from './agenda-api';
import { AppointmentRow } from './appointment-row';
import { BookingKind, type BookingTarget } from './booking-form';
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
    return (
      <EmptyState
        {...Copy.emptyDay}
        action={
          <Button
            variant="outline"
            onClick={() => {
              onNew({ kind: BookingKind.new, day: agenda.from });
            }}
          >
            {Copy.newBooking}
          </Button>
        }
        preview={<GhostDay />}
      />
    );
  return (
    <div className={days > 1 ? WEEK_GRID : 'grid gap-4'}>
      {sections.map((day) => (
        <DaySection key={day} day={day} agenda={agenda} showTitle={days > 1} onNew={onNew} />
      ))}
    </div>
  );
}

const WEEK_GRID = 'grid gap-6 md:grid-cols-2 md:gap-x-4 xl:grid-cols-3 2xl:grid-cols-4';

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
    <section aria-label={dayTitle(day)} className="grid min-w-0 content-start gap-2 *:min-w-0">
      {showTitle && (
        <h2 className="px-4 text-sm font-semibold first-letter:uppercase md:px-0">
          {dayTitle(day)}
        </h2>
      )}
      {offs.map((off) => (
        <TimeOffNote key={off.id} off={off} timezone={timezone} />
      ))}
      {items.length === 0 && showTitle && (
        <p className="mx-4 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground md:mx-0">
          {Copy.emptyWeek}
        </p>
      )}
      {items.length > 0 && (
        <ul className="divide-y border-y bg-card md:rounded-xl md:border md:shadow-card">
          {items.map((item) => (
            <AppointmentRow key={item.id} item={item} timezone={timezone} onMove={onNew} />
          ))}
        </ul>
      )}
    </section>
  );
}

const GHOST_HOURS = ['08:00', '10:00', '12:00', '14:00', '16:00'] as const;

/** Empty day: the hours of the day, faint, where the bookings will land. */
function GhostDay() {
  return (
    <ol className="rounded-xl border border-dashed">
      {GHOST_HOURS.map((hour) => (
        <li
          key={hour}
          className="flex items-center gap-4 border-b border-dashed px-4 py-3 text-xs text-muted-foreground tabular-nums last:border-0"
        >
          <span className="w-10">{hour}</span>
          <span className="h-2 flex-1 rounded-full bg-muted" />
        </li>
      ))}
    </ol>
  );
}
