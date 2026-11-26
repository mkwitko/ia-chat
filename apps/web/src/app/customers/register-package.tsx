import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/money';
import { Route } from '@/routes';
import { TextField } from '../setup/fields';
import { useRegisterPackage, type PackageOption } from './packages-api';
import { PackagesCopy as Copy } from './packages-copy';
import { SelectField } from './select-field';

const DAY_LENGTH = 10;
const FIRST = '0';
const MS_PER_MINUTE = 60_000;

/** Today as the device's local `YYYY-MM-DD` (the date input's format). */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * MS_PER_MINUTE)
    .toISOString()
    .slice(0, DAY_LENGTH);
}

interface Props {
  customerId: string;
  options: readonly PackageOption[];
}

/** "Registrar pacote": one of the profile's packages, the purchase date and whether it is paid. */
export function RegisterPackage({ customerId, options }: Readonly<Props>) {
  if (options.length === 0) return <NoOptions />;
  return <RegisterForm customerId={customerId} options={options} />;
}

function NoOptions() {
  return (
    <div className="grid gap-1 px-4 pt-3 text-sm text-muted-foreground md:px-0">
      <p>{Copy.noOptions}</p>
      <Link
        to={Route.profile}
        className="flex min-h-11 w-fit items-center font-semibold text-foreground underline-offset-4 hover:underline"
      >
        {Copy.openProfile}
      </Link>
    </div>
  );
}

function useRegisterForm({ customerId, options }: Props) {
  const [choice, setChoice] = useState(FIRST);
  const [purchasedOn, setPurchasedOn] = useState(today);
  const [paid, setPaid] = useState(false);
  const register = useRegisterPackage(customerId);
  const submit = () => {
    const picked = options[Number(choice)];
    if (!picked?.sessions || !purchasedOn) return;
    const { name, sessions, priceCents } = picked;
    register.mutate(
      { name, sessions, priceCents, purchasedOn, paid },
      {
        onSuccess: () => toast.success(Copy.registered),
        onError: () => toast.error(Copy.failed),
      },
    );
  };
  const fields = { choice, setChoice, purchasedOn, setPurchasedOn, paid, setPaid };
  return { fields, submit, pending: register.isPending };
}

function RegisterForm(props: Readonly<Props>) {
  const { fields, submit, pending } = useRegisterForm(props);
  return (
    <form
      className="grid gap-3 px-4 pt-5 md:px-0"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <h3 className="text-base">{Copy.registerHeading}</h3>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <SelectField
          id="package-choice"
          label={Copy.package}
          value={fields.choice}
          onChange={fields.setChoice}
        >
          {props.options.map((option, index) => (
            <option key={`${option.name}-${String(index)}`} value={String(index)}>
              {Copy.option(option.name, option.sessions ?? 0, formatCents(option.priceCents))}
            </option>
          ))}
        </SelectField>
        <TextField
          id="package-date"
          label={Copy.date}
          type="date"
          required
          value={fields.purchasedOn}
          onChange={fields.setPurchasedOn}
        />
      </div>
      <PaidCheckbox checked={fields.paid} onChange={fields.setPaid} />
      <Button type="submit" variant="outline" className="justify-self-start" disabled={pending}>
        {Copy.register}
      </Button>
    </form>
  );
}

function PaidCheckbox({
  checked,
  onChange,
}: Readonly<{ checked: boolean; onChange: (checked: boolean) => void }>) {
  return (
    <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm font-medium">
      <input
        type="checkbox"
        className="size-5 accent-primary"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      {Copy.paidLabel}
    </label>
  );
}
