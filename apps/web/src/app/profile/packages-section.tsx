import { confirmRemove } from '@/components/ui/confirm-dialog';
import { CommonCopy } from '../setup/setup-copy';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCents, parseReais } from '@/lib/money';
import { AddButton } from '../setup/add-button';
import { feedback } from '../setup/feedback';
import { TextField } from '../setup/fields';
import { useProfilePatch, type BusinessPackage } from './profile-api';
import { ProfileCopy as Copy } from './profile-copy';

const EMPTY = '';
const MAX_SESSIONS = 100;

/** M-04: packages with an exact price the assistant quotes ("4 sessões", R$ 800,00). */
export function PackagesSection({ titled = true }: Readonly<{ titled?: boolean }>) {
  const { profile, patch, pending } = useProfilePatch();
  if (!profile.data) return null;
  const packages = profile.data.profile.packages;
  const save = (next: BusinessPackage[]) => {
    patch({ packages: next }, feedback);
  };
  return (
    <section className="grid gap-3" aria-labelledby={titled ? 'packages-heading' : undefined}>
      {titled && (
        <>
          <h2 id="packages-heading" className="text-lg">
            {Copy.packagesHeading}
          </h2>
          <p className="text-sm text-muted-foreground">{Copy.packagesIntro}</p>
        </>
      )}
      {packages.length === 0 && <p className="text-sm">{Copy.noPackages}</p>}
      <PackageList
        packages={packages}
        pending={pending}
        onRemove={(index) => {
          save(packages.filter((_, at) => at !== index));
        }}
      />
      <AddPackage
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
          className="flex items-center gap-3 py-2 pr-1 pl-4"
        >
          <span className="grid min-w-0 flex-1">
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {item.sessions === undefined
                ? formatCents(item.priceCents)
                : `${Copy.packageSessionsCount(item.sessions)} · ${formatCents(item.priceCents)}`}
            </span>
          </span>
          <Button
            variant="ghost"
            className="text-danger"
            aria-label={Copy.removePackage(item.name)}
            disabled={pending}
            onClick={() => {
              confirmRemove(Copy.removePackageConfirm(item.name), onRemove, index);
            }}
          >
            {CommonCopy.remove}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function usePackageForm(onAdd: (item: BusinessPackage) => void) {
  const [name, setName] = useState(EMPTY);
  const [price, setPrice] = useState(EMPTY);
  const [sessions, setSessions] = useState(EMPTY);
  const priceCents = parseReais(price);
  const count = sessions === EMPTY ? undefined : Number(sessions);
  const ready = priceCents !== null && name.trim().length > 0;
  const submit = () => {
    if (priceCents === null || !ready) return;
    onAdd({ name: name.trim(), priceCents, ...(count ? { sessions: count } : {}) });
    setName(EMPTY);
    setPrice(EMPTY);
    setSessions(EMPTY);
  };
  return {
    name,
    setName,
    price,
    setPrice,
    sessions,
    setSessions,
    invalid: price !== EMPTY && priceCents === null,
    ready,
    submit,
  };
}

interface AddProps {
  pending: boolean;
  onAdd: (item: BusinessPackage) => void;
}

/** The form opens only when asked (round 3: no empty fields waiting on the page). */
function AddPackage({ pending, onAdd }: Readonly<AddProps>) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <AddButton
        label={Copy.addPackage}
        onClick={() => {
          setOpen(true);
        }}
      />
    );
  const close = () => {
    setOpen(false);
  };
  return (
    <PackageForm
      pending={pending}
      onAdd={(item) => {
        onAdd(item);
        close();
      }}
      onCancel={close}
    />
  );
}

function PackageForm({ pending, onAdd, onCancel }: Readonly<AddProps & { onCancel: () => void }>) {
  const form = usePackageForm(onAdd);
  const { name, setName, price, setPrice, invalid, ready, submit } = form;
  return (
    <form
      className="grid grid-cols-2 items-end gap-3 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="col-span-2">
        <TextField
          id="package-name"
          label={Copy.packageName}
          value={name}
          onChange={setName}
          maxLength={80}
        />
      </div>
      <SessionsField value={form.sessions} onChange={form.setSessions} />
      <TextField
        id="package-price"
        label={Copy.packagePrice}
        inputMode="decimal"
        value={price}
        onChange={setPrice}
        aria-invalid={invalid}
      />
      <div className="col-span-2 flex gap-2">
        <Button type="submit" disabled={pending || !ready}>
          {Copy.addPackage}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {CommonCopy.cancel}
        </Button>
      </div>
    </form>
  );
}

function SessionsField({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (value: string) => void }>) {
  return (
    <TextField
      id="package-sessions"
      label={Copy.packageSessions}
      type="number"
      inputMode="numeric"
      min={1}
      max={MAX_SESSIONS}
      value={value}
      onChange={onChange}
    />
  );
}
