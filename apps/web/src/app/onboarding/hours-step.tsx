import { useAvailability, type RuleWindow } from '../agenda/agenda-api';
import { RulesEditor } from '../agenda/rules-editor';
import { CalendarSection } from '../calendar/calendar-section';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { CommonCopy } from '../setup/setup-copy';
import { OnboardingCopy as Copy } from './onboarding-copy';

const Weekday = { mon: 1, fri: 5 } as const;
const DEFAULT_WINDOW = { start: '09:00', end: '18:00' } as const;

/** A starting grid to confirm when nothing came from the page: Monday to Friday, 9h to 18h. */
const DEFAULT_GRID: RuleWindow[] = Array.from(
  { length: Weekday.fri - Weekday.mon + 1 },
  (_, index) => ({ weekday: Weekday.mon + index, ...DEFAULT_WINDOW }),
);

/** Step 4: the weekly grid (from the review, or a default to confirm) and the Google Agenda. */
export function HoursStep({ onDone }: Readonly<{ onDone: () => void }>) {
  const availability = useAvailability();
  if (availability.isPending) return <ListSkeleton />;
  if (availability.isError)
    return (
      <LoadError message={CommonCopy.loadFailed} onRetry={() => void availability.refetch()} />
    );
  const saved = availability.data.rules;
  return (
    <div className="grid gap-8">
      {saved.length === 0 && (
        <p className="rounded-lg bg-attention-soft px-3 py-2 text-sm">{Copy.defaultHoursNote}</p>
      )}
      <div className="-mx-4 md:mx-0">
        <RulesEditor
          initial={saved.length > 0 ? saved : DEFAULT_GRID}
          saveLabel={Copy.saveHours}
          onSaved={onDone}
        />
      </div>
      <div className="-mx-4 md:mx-0">
        <CalendarSection />
      </div>
    </div>
  );
}
