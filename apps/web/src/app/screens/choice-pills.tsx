import { cn } from '@/lib/utils';

interface ChoicePillsProps<T> {
  /** Radio group name, unique on the page. */
  name: string;
  /** Read by screen readers: what is being chosen. */
  legend: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * The one filter pattern of the panel (Conversas, Clientes, Resultados): pills that wrap to a
 * new line, never a sideways scroll that hides choices; the chosen one in ink.
 */
export function ChoicePills<T>({
  name,
  legend,
  options,
  value,
  onChange,
}: Readonly<ChoicePillsProps<T>>) {
  return (
    <fieldset className="flex flex-wrap gap-2 px-4 py-2 md:px-0">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.label}
          className={cn(
            'flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
            value === option.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:border-line-strong hover:text-foreground',
          )}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === option.value}
            onChange={() => {
              onChange(option.value);
            }}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
