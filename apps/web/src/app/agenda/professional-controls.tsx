import { Button } from '@/components/ui/button';
import type { ProfessionalRef } from './agenda-api';
import { initialsOf } from './professional-api';
import { ProfessionalCopy as Copy } from './professional-copy';

interface FilterProps {
  professionals: readonly ProfessionalRef[];
  /** '' is "Todos" (only offered when `withAll`). */
  value: string;
  onChange: (id: string) => void;
  withAll?: boolean;
}

/** Spec 10, "Agenda": whose agenda is on screen. Pills, the chosen one in ink. */
export function ProfessionalFilter({
  professionals,
  value,
  onChange,
  withAll = false,
}: Readonly<FilterProps>) {
  const options = [...(withAll ? [{ id: '', name: Copy.all }] : []), ...professionals];
  return (
    <div
      role="group"
      aria-label={Copy.filterLabel}
      className="flex flex-wrap gap-2 px-4 pb-1 md:px-0"
    >
      {options.map((option) => (
        <Button
          key={option.id || Copy.all}
          type="button"
          variant={value === option.id ? 'default' : 'outline'}
          aria-pressed={value === option.id}
          className="h-10 shrink-0 rounded-full"
          onClick={() => {
            onChange(option.id);
          }}
        >
          {option.id && <Initials name={option.name} />}
          {option.name}
        </Button>
      ))}
    </div>
  );
}

/** Initials in a ring: tells professionals apart without leaning on color (RN-55). */
export function Initials({ name }: Readonly<{ name: string }>) {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full border border-current/30 text-[11px] leading-none font-semibold tracking-tight"
    >
      {initialsOf(name)}
    </span>
  );
}

/** "AS com Ana Souza" under an appointment when the agenda shows everyone. */
export function ProfessionalTag({ name }: Readonly<{ name: string }>) {
  return (
    <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Initials name={name} />
      <span className="truncate">{Copy.with(name)}</span>
    </span>
  );
}
