import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AvailabilityCopy as Copy } from './agenda-copy';
import type { RuleWindow } from './agenda-api';
import { applyToDays, commonWindow, WEEK_ORDER, WORKWEEK } from './rules-model';

const DEFAULT_WINDOW = { start: '08:00', end: '18:00' } as const;
interface Window {
  start: string;
  end: string;
}

interface QuickHoursProps {
  rules: RuleWindow[];
  onChange: (rules: RuleWindow[]) => void;
}

/**
 * "The same hours on several days" in one go (Nielsen 7): tap the days, set from and to, apply.
 * The day-by-day list below stays for exceptions (lunch break, Saturday morning).
 */
export function QuickHours({ rules, onChange }: Readonly<QuickHoursProps>) {
  // Start from what is saved: the most common window and the days that have it.
  const [seed] = useState(() => commonWindow(rules));
  const [days, setDays] = useState<readonly number[]>(seed?.days ?? WORKWEEK);
  const [window, setWindow] = useState<Window>(seed?.window ?? DEFAULT_WINDOW);
  const valid = days.length > 0 && window.start < window.end;
  return (
    <fieldset className="grid gap-3 rounded-xl border bg-card p-4">
      <legend className="sr-only">{Copy.quickTitle}</legend>
      <p className="font-semibold">{Copy.quickTitle}</p>
      <DayChips days={days} onChange={setDays} />
      <TimeRange value={window} onChange={setWindow} />
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        disabled={!valid}
        onClick={() => {
          onChange(applyToDays(rules, days, window));
        }}
      >
        {Copy.quickApply(days.length)}
      </Button>
      <p className="text-sm text-muted-foreground">{valid ? Copy.quickHint : Copy.quickInvalid}</p>
    </fieldset>
  );
}

function DayChips({
  days,
  onChange,
}: Readonly<{ days: readonly number[]; onChange: (days: readonly number[]) => void }>) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={Copy.quickDays}>
      {WEEK_ORDER.map((day) => {
        const on = days.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            onClick={() => {
              onChange(on ? days.filter((d) => d !== day) : [...days, day]);
            }}
            className={cn(
              'min-h-11 min-w-11 rounded-full border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
            )}
          >
            {Copy.weekdaysShort[day]}
          </button>
        );
      })}
    </div>
  );
}

function TimeRange({
  value,
  onChange,
}: Readonly<{ value: Window; onChange: (w: Window) => void }>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{Copy.from}</span>
      <Input
        type="time"
        aria-label={Copy.from}
        value={value.start}
        className="w-32"
        onChange={(event) => {
          onChange({ ...value, start: event.target.value });
        }}
      />
      <span className="text-sm text-muted-foreground">{Copy.toShort}</span>
      <Input
        type="time"
        aria-label={Copy.to}
        value={value.end}
        className="w-32"
        onChange={(event) => {
          onChange({ ...value, end: event.target.value });
        }}
      />
    </div>
  );
}
