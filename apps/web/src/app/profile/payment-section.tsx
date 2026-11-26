import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PaymentMethod } from './profile-api';
import { NOTICE_OPTIONS, PAYMENT_LABEL, ProfileCopy as Copy } from './profile-copy';

const CHIP =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors hover:border-line-strong has-focus-visible:outline-2 has-focus-visible:outline-ring';

interface PillsProps {
  chosen: PaymentMethod[];
  onChange: (methods: PaymentMethod[]) => void;
}

export function PaymentPills({ chosen, onChange }: Readonly<PillsProps>) {
  const toggle = (method: PaymentMethod) => {
    onChange(
      chosen.includes(method) ? chosen.filter((item) => item !== method) : [...chosen, method],
    );
  };
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-medium">{Copy.paymentLegend}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.values(PaymentMethod).map((method) => (
          <label
            key={method}
            className={cn(
              CHIP,
              chosen.includes(method) && 'border-primary bg-muted ring-1 ring-primary',
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={chosen.includes(method)}
              onChange={() => {
                toggle(method);
              }}
            />
            {chosen.includes(method) && <Check className="size-4" aria-hidden="true" />}
            {PAYMENT_LABEL[method]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NoticeSelect({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (minutes: number) => void }>) {
  const known = NOTICE_OPTIONS.some((option) => option.minutes === value);
  return (
    <div className="grid gap-2">
      <Label htmlFor="profile-notice">{Copy.notice}</Label>
      <select
        id="profile-notice"
        aria-describedby="profile-notice-hint"
        className="h-11 rounded-lg border border-line-strong bg-card px-3 text-base"
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      >
        {!known && <option value={value}>{Copy.minutes(value)}</option>}
        {NOTICE_OPTIONS.map((option) => (
          <option key={option.minutes} value={option.minutes}>
            {option.label}
          </option>
        ))}
      </select>
      <p id="profile-notice-hint" className="text-sm text-muted-foreground">
        {Copy.noticeHint}
      </p>
    </div>
  );
}

export function NoShowToggle({
  checked,
  onChange,
}: Readonly<{ checked: boolean; onChange: (value: boolean) => void }>) {
  return (
    <div className="grid gap-1">
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="size-5 shrink-0 accent-primary"
          aria-describedby="profile-no-show-hint"
          checked={checked}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
        />
        {Copy.noShow}
      </label>
      <p id="profile-no-show-hint" className="pl-8 text-sm text-muted-foreground">
        {Copy.noShowHint}
      </p>
    </div>
  );
}
