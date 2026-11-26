import type { ReactNode } from 'react';

export interface Choice<T extends string> {
  value: T;
  label: string;
  body: string;
  /** Extra content under the selected option only (preview, warning). */
  detail?: ReactNode;
}

interface ChoiceListProps<T extends string> {
  name: string;
  legend: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Native radio buttons as cards: keyboard, screen reader and 44 px targets for free. */
export function ChoiceList<T extends string>(props: Readonly<ChoiceListProps<T>>) {
  const { name, legend, choices, value, onChange, disabled } = props;
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="pb-2 text-base font-semibold">{legend}</legend>
      {choices.map((choice) => (
        <label
          key={choice.value}
          className="flex cursor-pointer gap-3 rounded-xl border bg-card p-4 has-checked:border-primary has-checked:bg-muted has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input
            type="radio"
            name={name}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => {
              onChange(choice.value);
            }}
            className="mt-1 size-5 shrink-0 accent-primary"
          />
          <span className="grid min-w-0 gap-1">
            <span className="font-semibold">{choice.label}</span>
            <span className="text-sm text-muted-foreground">{choice.body}</span>
            {value === choice.value && choice.detail}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
