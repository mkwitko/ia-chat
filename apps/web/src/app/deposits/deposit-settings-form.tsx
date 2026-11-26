import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { centsToInput, parseReais } from '@/lib/money';
import { notifyError } from '@/lib/notify';
import { feedback } from '../setup/feedback';
import { CommonCopy } from '../setup/setup-copy';
import { useSaveDepositSettings, type DepositSettingsView } from './deposits-api';
import { DepositsCopy as Copy } from './deposits-copy';

const QUARTER_HOUR = 15;
const HALF_HOUR = 30;
const ONE_HOUR = 60;
const TWO_HOURS = 120;
const FOUR_HOURS = 240;
const HOLD_OPTIONS = [QUARTER_HOUR, HALF_HOUR, ONE_HOUR, TWO_HOURS, FOUR_HOURS] as const;
const UNPROCESSABLE = 422;
const FIELD = 'grid gap-2';

type Amounts = Record<string, string>;
type TextKey = 'pixKey' | 'receiverName' | 'city' | 'refundPolicy';

const amountsOf = (view: DepositSettingsView): Amounts =>
  Object.fromEntries(
    view.services.map((service) => [
      service.id,
      service.depositCents ? centsToInput(service.depositCents) : '',
    ]),
  );

/** Each typed amount in cents (blank = no deposit), or null when one is not a price. */
function parseAmounts(amounts: Amounts) {
  const invalid = Object.values(amounts).some((text) => text.trim() && parseReais(text) === null);
  if (invalid) return null;
  return Object.entries(amounts).map(([id, text]) => ({
    id,
    depositCents: text.trim() ? parseReais(text) : null,
  }));
}

const initialForm = (view: DepositSettingsView) => ({
  pixKey: view.settings?.pixKey ?? '',
  receiverName: view.settings?.receiverName ?? '',
  city: view.settings?.city ?? '',
  holdMinutes: view.settings?.holdMinutes ?? HALF_HOUR,
  refundPolicy: view.settings?.refundPolicy ?? '',
});

function useDepositForm(view: DepositSettingsView) {
  const save = useSaveDepositSettings();
  const [form, setForm] = useState(initialForm(view));
  const [amounts, setAmounts] = useState(amountsOf(view));
  const text = (key: TextKey) => ({
    value: form[key],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm({ ...form, [key]: event.target.value });
    },
  });
  const submit = () => {
    const services = parseAmounts(amounts);
    if (!services) {
      notifyError(Copy.invalidAmount);
      return;
    }
    const body = { ...form, refundPolicy: form.refundPolicy.trim() || null, services };
    save.mutate(body, {
      onSuccess: feedback.onSuccess,
      onError: (error) => {
        if (error instanceof ApiError && error.status === UNPROCESSABLE)
          notifyError(Copy.invalidKey);
        else feedback.onError(error);
      },
    });
  };
  const setHold = (holdMinutes: number) => {
    setForm({ ...form, holdMinutes });
  };
  return { save, form, text, amounts, setAmounts, setHold, submit };
}

export function DepositSettingsForm({ view }: Readonly<{ view: DepositSettingsView }>) {
  const { save, form, text, amounts, setAmounts, setHold, submit } = useDepositForm(view);
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Field id="pix-key" label={Copy.pixKey} hint={Copy.pixKeyHint} {...text('pixKey')} required />
      <Field id="pix-name" label={Copy.receiverName} {...text('receiverName')} required />
      <Field id="pix-city" label={Copy.city} {...text('city')} required />
      <HoldSelect value={form.holdMinutes} onChange={setHold} />
      <div className={FIELD}>
        <Label htmlFor="pix-refund">{Copy.refundPolicy}</Label>
        <Textarea id="pix-refund" {...text('refundPolicy')} />
      </div>
      <ServiceAmounts view={view} amounts={amounts} onChange={setAmounts} />
      <Button type="submit" className="justify-self-start" disabled={save.isPending}>
        {save.isPending ? CommonCopy.saving : Copy.save}
      </Button>
    </form>
  );
}

type FieldProps = { id: string; label: string; hint?: string } & Parameters<typeof Input>[0];

function Field({ id, label, hint, ...input }: Readonly<FieldProps>) {
  return (
    <div className={FIELD}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...input} />
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function HoldSelect({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (minutes: number) => void }>) {
  return (
    <div className={FIELD}>
      <Label htmlFor="pix-hold">{Copy.holdMinutes}</Label>
      <select
        id="pix-hold"
        className="h-11 w-fit rounded-lg border border-line-strong bg-card px-3 text-base"
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      >
        {HOLD_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {Copy.minutes(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

interface AmountsProps {
  view: DepositSettingsView;
  amounts: Amounts;
  onChange: (amounts: Amounts) => void;
}

function ServiceAmounts({ view, amounts, onChange }: Readonly<AmountsProps>) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-base font-medium">{Copy.services}</legend>
      <p className="text-sm text-muted-foreground">{Copy.servicesHint}</p>
      {view.services.map((service) => (
        <Field
          key={service.id}
          id={`deposit-${service.id}`}
          label={service.name}
          inputMode="decimal"
          value={amounts[service.id] ?? ''}
          onChange={(event) => {
            onChange({ ...amounts, [service.id]: event.target.value });
          }}
        />
      ))}
    </fieldset>
  );
}
