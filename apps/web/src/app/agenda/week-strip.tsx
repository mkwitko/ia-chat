import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AgendaBody, covers } from './agenda-body';
import { AgendaCopy as Copy } from './agenda-copy';
import { addDaysIso, dayOf, dayTitle, stripDay } from './agenda-dates';
import type { AgendaView } from './agenda-api';
import { WEEK_DAYS } from './agenda-toolbar';
import type { BookingTarget } from './booking-form';

interface PhoneWeekProps {
  agenda: AgendaView;
  onNew: (target: BookingTarget) => void;
  names?: ReadonlyMap<string, string> | undefined;
}

/** Only what touches one day of a week's agenda. */
function dayOnly(agenda: AgendaView, day: string): AgendaView {
  const { timezone } = agenda;
  return {
    ...agenda,
    from: day,
    appointments: agenda.appointments.filter((item) => dayOf(item.startsAt, timezone) === day),
    timeOffs: agenda.timeOffs.filter((off) => covers(off, day, timezone)),
    waitlist: agenda.waitlist.filter((item) =>
      covers({ startsAt: item.windowStart, endsAt: item.windowEnd }, day, timezone),
    ),
  };
}

/** Phone (round 3): the week at a glance, seven days with their count, and the chosen day below. */
export function PhoneWeek({ agenda, onNew, names }: Readonly<PhoneWeekProps>) {
  const days = Array.from({ length: WEEK_DAYS }, (_, index) => addDaysIso(agenda.from, index));
  const [picked, setPicked] = useState(agenda.from);
  const day = days.includes(picked) ? picked : agenda.from;
  const counts = new Map(
    days.map((one) => [one, dayOnly(agenda, one).appointments.length] as const),
  );
  return (
    <>
      <WeekStrip days={days} value={day} counts={counts} onPick={setPicked} />
      <AgendaBody agenda={dayOnly(agenda, day)} days={1} onNew={onNew} names={names} />
    </>
  );
}

interface StripProps {
  days: string[];
  value: string;
  counts: ReadonlyMap<string, number>;
  onPick: (day: string) => void;
}

function WeekStrip({ days, value, counts, onPick }: Readonly<StripProps>) {
  return (
    <div role="group" aria-label={Copy.weekStrip} className="grid grid-cols-7 gap-1 px-2 py-3">
      {days.map((day) => {
        const { weekday, date } = stripDay(day);
        const count = counts.get(day) ?? 0;
        const on = day === value;
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            aria-label={Copy.dayCount(dayTitle(day), count)}
            onClick={() => {
              onPick(day);
            }}
            className={cn(
              'grid min-h-16 place-items-center gap-0.5 rounded-lg py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <span>{weekday}</span>
            <span className={cn('text-base font-semibold', !on && 'text-foreground')}>{date}</span>
            <CountMark count={count} on={on} />
          </button>
        );
      })}
    </div>
  );
}

/** The day's number of appointments; a blank keeps the row aligned on empty days. */
function CountMark({ count, on }: Readonly<{ count: number; on: boolean }>) {
  if (count === 0) return <span className="h-4" aria-hidden="true" />;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'min-w-4 rounded-full px-1 text-xs leading-4 font-semibold tabular-nums',
        on ? 'bg-primary-foreground text-primary' : 'bg-muted text-foreground',
      )}
    >
      {count}
    </span>
  );
}
