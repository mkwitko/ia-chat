import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { CardList, Note, Section } from '../screens/section';
import { dayLabel } from './customer-format';
import { useAdjustPackage, usePackages, type ClientPackage } from './packages-api';
import { EntryReasonLabel, ManualReason, PackagesCopy as Copy } from './packages-copy';
import { RegisterPackage } from './register-package';
import { SelectField } from './select-field';

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MANUAL = Object.values(ManualReason);

/** "20/11/2026" from a local `YYYY-MM-DD`, without a timezone shift. */
export const isoDayLabel = (day: string) => day.replace(ISO_DAY, '$3/$2/$1');

/** Research 09 #7: the client's packages, the balance of each, its history and a manual adjust. */
export function PackagesSection({ customerId }: Readonly<{ customerId: string }>) {
  const listing = usePackages(customerId);
  if (!listing.data) return null;
  const { packages, options } = listing.data;
  return (
    <Section title={Copy.heading}>
      <Note>{Copy.intro}</Note>
      {packages.length === 0 && <Note>{Copy.empty}</Note>}
      {packages.length > 0 && (
        <CardList>
          {packages.toReversed().map((item) => (
            <PackageRow key={item.id} customerId={customerId} item={item} />
          ))}
        </CardList>
      )}
      <RegisterPackage customerId={customerId} options={options} />
    </Section>
  );
}

function PackageRow({ customerId, item }: Readonly<{ customerId: string; item: ClientPackage }>) {
  return (
    <li className="grid gap-1 px-4 py-3">
      <p className="font-semibold tabular-nums">
        {Copy.balance(item.name, item.used, item.sessions)}
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {Copy.remaining(item.remaining)} · {Copy.bought(isoDayLabel(item.purchasedOn))} ·{' '}
        {item.paid ? Copy.paid : Copy.unpaid}
      </p>
      <details className="group text-sm">
        <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          {Copy.history} · {Copy.adjust}
        </summary>
        <History item={item} />
        <Adjust customerId={customerId} packageId={item.id} />
      </details>
    </li>
  );
}

function History({ item }: Readonly<{ item: ClientPackage }>) {
  if (item.entries.length === 0) return null;
  return (
    <ul className="grid gap-1 pb-3 text-muted-foreground">
      {item.entries.map((entry, index) => (
        <li key={`${entry.createdAt}-${String(index)}`} className="tabular-nums">
          {dayLabel(entry.createdAt)} · {EntryReasonLabel[entry.reason] ?? entry.reason} ·{' '}
          {entry.delta > 0 ? Copy.used : Copy.givenBack}
        </li>
      ))}
    </ul>
  );
}

function Adjust({ customerId, packageId }: Readonly<{ customerId: string; packageId: string }>) {
  const id = useId();
  const [reason, setReason] = useState<ManualReason>(ManualReason.correction);
  const adjust = useAdjustPackage(customerId);
  const send = (delta: 1 | -1) => {
    adjust.mutate(
      { packageId, delta, reason },
      {
        onSuccess: () => toast.success(Copy.adjusted),
        onError: (error) => {
          const code = error instanceof ApiError ? error.code : undefined;
          toast.error((code && Copy.adjustErrors[code]) ?? Copy.failed);
        },
      },
    );
  };
  return (
    <div className="grid gap-3 pb-1 sm:max-w-sm">
      <SelectField
        id={id}
        label={Copy.reason}
        value={reason}
        onChange={(value) => {
          setReason(MANUAL.find((option) => option === value) ?? ManualReason.correction);
        }}
      >
        {MANUAL.map((option) => (
          <option key={option} value={option}>
            {EntryReasonLabel[option]}
          </option>
        ))}
      </SelectField>
      <AdjustButtons pending={adjust.isPending} send={send} />
    </div>
  );
}

const STEPS = [
  { delta: 1, label: Copy.useOne },
  { delta: -1, label: Copy.giveBack },
] as const;

function AdjustButtons({
  pending,
  send,
}: Readonly<{ pending: boolean; send: (delta: 1 | -1) => void }>) {
  return (
    <div className="flex flex-wrap gap-2">
      {STEPS.map(({ delta, label }) => (
        <Button
          key={delta}
          variant="outline"
          disabled={pending}
          onClick={() => {
            send(delta);
          }}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
