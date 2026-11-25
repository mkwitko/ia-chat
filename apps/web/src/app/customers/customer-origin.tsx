import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { feedback } from '../setup/feedback';
import { TextField } from '../setup/fields';
import { Section } from '../screens/section';
import { useUpdateCustomer } from './customers-api';
import { CustomerCopy as Copy } from './customers-copy';
import { OriginLabel } from './customers-labels';
import { Origin, type CustomerSummary } from './customers-types';
import { SelectField } from './select-field';

const REF_MAX_LENGTH = 40;

function OriginSelect({
  value,
  onChange,
}: Readonly<{ value: Origin; onChange: (origin: Origin) => void }>) {
  return (
    <SelectField
      id="customer-origin"
      label={Copy.originLabel}
      value={value}
      onChange={(next) => {
        onChange(Object.values(Origin).find((known) => known === next) ?? value);
      }}
    >
      {Object.values(Origin).map((origin) => (
        <option key={origin} value={origin}>
          {OriginLabel[origin]}
        </option>
      ))}
    </SelectField>
  );
}

/** How the person arrived; the referral code only matters for "Indicação". */
export function OriginSection({ customer }: Readonly<{ customer: CustomerSummary }>) {
  const update = useUpdateCustomer(customer.id);
  const [origin, setOrigin] = useState<Origin>(customer.origin);
  const [ref, setRef] = useState(customer.originRef ?? '');
  const isReferral = origin === Origin.referral;
  function save() {
    const originRef = isReferral ? ref.trim() || null : null;
    update.mutate(
      { origin, originRef },
      { onSuccess: () => toast.success(Copy.originSaved), onError: feedback.onError },
    );
  }
  return (
    <Section title={Copy.originHeading}>
      <form
        className="grid gap-3 px-4 md:px-0"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <OriginSelect value={origin} onChange={setOrigin} />
        {isReferral && (
          <TextField
            id="customer-origin-ref"
            label={Copy.originRefLabel}
            hint={Copy.originRefHint}
            value={ref}
            maxLength={REF_MAX_LENGTH}
            onChange={setRef}
          />
        )}
        <Button type="submit" variant="outline" disabled={update.isPending}>
          {Copy.originSave}
        </Button>
      </form>
    </Section>
  );
}
