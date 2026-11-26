interface SwitchRowProps {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

/** One owner switch with its explanation under it, 44 px tall. */
export function SwitchRow({
  id,
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: Readonly<SwitchRowProps>) {
  return (
    <div className="grid gap-1">
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          role="switch"
          className="size-5 shrink-0 accent-primary"
          aria-describedby={`${id}-hint`}
          checked={checked}
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
        />
        {label}
      </label>
      <p id={`${id}-hint`} className="pl-8 text-sm text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}
