import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
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
}

function rangeLabel(day: string, view: View): string {
  if (!day) return '';
  if (view === View.day) return dayTitle(day);
  return `${shortDay(day)} a ${shortDay(addDaysIso(day, WEEK_DAYS - 1))}`;
}

/** One row: previous, the day or week in words, next, "Hoje"; day/week on the computer. */
export function AgendaToolbar({ day, view, onChange }: Readonly<ToolbarProps>) {
  return (
    <div className="flex items-center gap-2 border-b bg-card px-2 pb-2 md:mb-6 md:border-0 md:bg-transparent md:px-0 md:pb-0">
      <DayNav day={day} view={view} onChange={onChange} />
      <Button
        variant="outline"
        onClick={() => {
          onChange({ [DAY_PARAM]: '' });
        }}
      >
        {Copy.today}
      </Button>
      <div className="ml-auto hidden md:block">
        <ViewSwitch view={view} onChange={onChange} />
      </div>
    </div>
  );
}

/** Where the hours and days off are changed, quietly under the agenda. */
export function HoursLink() {
  return (
    <Link
      to={Route.clinicHours}
      className="mx-4 mt-4 flex min-h-11 w-fit items-center gap-2 font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:mx-0"
    >
      <Settings2 className="size-4" aria-hidden="true" />
      {Copy.settings}
    </Link>
  );
}

function DayNav({ day, view, onChange }: Readonly<ToolbarProps>) {
  const step = view === View.week ? WEEK_DAYS : 1;
  const move = (days: number) => () => {
    if (day) onChange({ [DAY_PARAM]: addDaysIso(day, days) });
  };
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 md:flex-none">
      <Button variant="ghost" size="icon" aria-label={Copy.previous} onClick={move(-step)}>
        <ChevronLeft aria-hidden="true" />
      </Button>
      <p
        className="min-w-0 flex-1 text-center font-semibold first-letter:uppercase md:w-56 md:flex-none"
        aria-live="polite"
      >
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
    <div role="group" aria-label={Copy.viewLabel} className="flex rounded-lg border bg-muted p-0.5">
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
