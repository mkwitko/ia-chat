import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

/** Native select (works best on phones) with a label, 44 px tall. */
export function SelectField({ id, label, value, onChange, children }: Readonly<SelectFieldProps>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {children}
      </select>
    </div>
  );
}
