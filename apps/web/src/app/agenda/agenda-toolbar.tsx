import { CalendarPlus, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Route } from '@/routes';
import { AgendaCopy as Copy } from './agenda-copy';
import { addDaysIso, dayTitle, shortDay } from './agenda-dates';

export const DAY_PARAM = 'dia';
export const VIEW_PARAM = 'visao';
export const View = { day: 'dia', week: 'semana' } as const;
export type View = (typeof View)[keyof typeof View];
export const WEEK_DAYS = 7;

interface ToolbarProps {
  day: string;
  view: View;
  onChange: (next: Record<string, string>) => void;
  onNew: () => void;
}

function rangeLabel(day: string, view: View): string {
  if (!day) return '';
  if (view === View.day) return dayTitle(day);
  return `${shortDay(day)} a ${shortDay(addDaysIso(day, WEEK_DAYS - 1))}`;
}

/** Day navigation, day/week switch and the two entry points: new booking and availability. */
export function AgendaToolbar({ day, view, onChange, onNew }: Readonly<ToolbarProps>) {
  return (
    <div className="grid gap-3 bg-card px-4 pb-3 md:bg-transparent md:px-0">
      <DayNav day={day} view={view} onChange={onChange} />
      <div className="flex flex-wrap items-center gap-2">
        <ViewSwitch view={view} onChange={onChange} />
        <Button
          variant="outline"
          onClick={() => {
            onChange({ [DAY_PARAM]: '' });
          }}
        >
          {Copy.today}
        </Button>
        <Button className="ml-auto" onClick={onNew}>
          <CalendarPlus aria-hidden="true" />
          {Copy.newBooking}
        </Button>
      </div>
      <Link
        to={Route.agendaAvailability}
        className="flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
      >
        <Settings2 className="size-4" aria-hidden="true" />
        {Copy.settings}
      </Link>
    </div>
  );
}

function DayNav({ day, view, onChange }: Readonly<Omit<ToolbarProps, 'onNew'>>) {
  const step = view === View.week ? WEEK_DAYS : 1;
  const move = (days: number) => () => {
    if (day) onChange({ [DAY_PARAM]: addDaysIso(day, days) });
  };
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" aria-label={Copy.previous} onClick={move(-step)}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      <p className="min-w-0 flex-1 text-center font-semibold capitalize" aria-live="polite">
        {rangeLabel(day, view)}
      </p>
      <Button variant="ghost" size="icon" aria-label={Copy.next} onClick={move(step)}>
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}

const OPTIONS = [
  { value: View.day, label: Copy.day },
  { value: View.week, label: Copy.week },
];

function ViewSwitch({ view, onChange }: Readonly<Pick<ToolbarProps, 'view' | 'onChange'>>) {
  return (
    <div role="group" aria-label={Copy.viewLabel} className="flex rounded-lg border p-0.5">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={view === option.value ? 'default' : 'ghost'}
          aria-pressed={view === option.value}
          className="h-10"
          onClick={() => {
            onChange({ [VIEW_PARAM]: option.value });
          }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
