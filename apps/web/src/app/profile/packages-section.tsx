import { X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCents, parseReais } from '@/lib/money';
import { feedback } from '../setup/feedback';
import { TextField } from '../setup/fields';
import { useProfilePatch, type BusinessPackage } from './profile-api';
import { ProfileCopy as Copy } from './profile-copy';

const EMPTY = '';
const ADD_CLASS = 'col-span-2 justify-self-start md:col-span-1';

/** M-04: packages with an exact price the assistant quotes ("4 sessões", R$ 800,00). */
export function PackagesSection() {
  const { profile, patch, pending } = useProfilePatch();
  if (!profile.data) return null;
  const packages = profile.data.profile.packages;
  const save = (next: BusinessPackage[]) => {
    patch({ packages: next }, feedback);
  };
  return (
    <section className="grid gap-3" aria-labelledby="packages-heading">
      <h2 id="packages-heading" className="text-lg">
        {Copy.packagesHeading}
      </h2>
      <p className="text-sm text-muted-foreground">{Copy.packagesIntro}</p>
      {packages.length === 0 && <p className="text-sm">{Copy.noPackages}</p>}
      <PackageList
        packages={packages}
        pending={pending}
        onRemove={(index) => {
          save(packages.filter((_, at) => at !== index));
        }}
      />
      <PackageForm
        pending={pending}
        onAdd={(item) => {
          save([...packages, item]);
        }}
      />
    </section>
  );
}

interface ListProps {
  packages: BusinessPackage[];
  pending: boolean;
  onRemove: (index: number) => void;
}

function PackageList({ packages, pending, onRemove }: Readonly<ListProps>) {
  if (packages.length === 0) return null;
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {packages.map((item, index) => (
        <li
          key={`${item.name}-${String(index)}`}
          className="flex items-center gap-3 py-1 pr-1 pl-4"
        >
          <span className="flex-1 font-medium">{item.name}</span>
          <span className="tabular-nums">{formatCents(item.priceCents)}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={Copy.removePackage(item.name)}
            disabled={pending}
            onClick={() => {
              onRemove(index);
            }}
          >
            <X aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function usePackageForm(onAdd: (item: BusinessPackage) => void) {
  const [name, setName] = useState(EMPTY);
  const [price, setPrice] = useState(EMPTY);
  const priceCents = parseReais(price);
  const ready = priceCents !== null && name.trim().length > 0;
  const submit = () => {
    if (priceCents === null || !ready) return;
    onAdd({ name: name.trim(), priceCents });
    setName(EMPTY);
    setPrice(EMPTY);
  };
  return {
    name,
    setName,
    price,
    setPrice,
    invalid: price !== EMPTY && priceCents === null,
    ready,
    submit,
  };
}

function PackageForm({
  pending,
  onAdd,
}: Readonly<{ pending: boolean; onAdd: (item: BusinessPackage) => void }>) {
  const { name, setName, price, setPrice, invalid, ready, submit } = usePackageForm(onAdd);
  return (
    <form
      className="grid grid-cols-[minmax(0,1fr)_7rem] items-end gap-3 md:grid-cols-[minmax(0,1fr)_9rem_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextField
        id="package-name"
        label={Copy.packageName}
        placeholder={Copy.packageNamePlaceholder}
        value={name}
        onChange={setName}
        maxLength={80}
      />
      <TextField
        id="package-price"
        label={Copy.packagePrice}
        inputMode="decimal"
        placeholder={Copy.packagePricePlaceholder}
        value={price}
        onChange={setPrice}
        aria-invalid={invalid}
      />
      <Button type="submit" variant="outline" className={ADD_CLASS} disabled={pending || !ready}>
        {Copy.addPackage}
      </Button>
    </form>
  );
}
