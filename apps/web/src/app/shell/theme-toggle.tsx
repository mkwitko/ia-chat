import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { ThemeChoice, useThemeChoice } from '@/lib/theme';

export const ThemeCopy = {
  label: 'Aparência',
  [ThemeChoice.system]: 'Sistema',
  [ThemeChoice.light]: 'Claro',
  [ThemeChoice.dark]: 'Escuro',
} as const;

const OPTIONS: readonly { value: ThemeChoice; icon: LucideIcon }[] = [
  { value: ThemeChoice.system, icon: Monitor },
  { value: ThemeChoice.light, icon: Sun },
  { value: ThemeChoice.dark, icon: Moon },
];

/** "Aparência: Sistema / Claro / Escuro", a segmented radio group (Mais and the sidebar footer). */
export function ThemeToggle({ className }: Readonly<{ className?: string }>) {
  const { choice, choose } = useThemeChoice();
  const name = useId();
  return (
    <fieldset className={cn('grid gap-2', className)}>
      <legend className="mb-2 text-xs font-medium text-muted-foreground">{ThemeCopy.label}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted p-1">
        {OPTIONS.map(({ value, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              'flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ring',
              choice === value && 'bg-card text-foreground shadow-card',
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={choice === value}
              onChange={() => {
                choose(value);
              }}
            />
            <Icon className="size-3.5" aria-hidden="true" />
            {ThemeCopy[value]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
