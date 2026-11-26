import { useState } from 'react';
import { centsToInput, parseReais } from '@/lib/money';
import { FormActions, TextField } from './fields';
import type { ServiceInput } from './setup-api';
import { ServicesCopy as Copy } from './setup-copy';

const DEFAULT_MINUTES = 60;
const MAX_MINUTES = 600;
const NO_PRICE = '';

interface ServiceFormProps {
  onRemove?: (() => void) | undefined;
  initial?: ServiceInput;
  pending: boolean;
  onSubmit: (input: ServiceInput) => void;
  onCancel: () => void;
}

/** Create or edit one service; the price is typed in reais and stored in cents. */
export function ServiceForm(props: Readonly<ServiceFormProps>) {
  const { pending, onSubmit, onCancel, onRemove } = props;
  const form = useServiceForm(props.initial);
  return (
    <form
      className="grid gap-4 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const input = form.input();
        if (input) onSubmit(input);
      }}
    >
      <TextField
        id="service-name"
        label={Copy.name}
        value={form.name}
        onChange={form.setName}
        required
        maxLength={80}
      />
      <ServiceNumbers form={form} />
      {form.invalidPrice && (
        <p role="alert" className="text-sm text-danger">
          {Copy.priceInvalid}
        </p>
      )}
      <VisibleCheckbox checked={form.visible} onChange={form.setVisible} />
      <FormActions
        pending={pending}
        disabled={form.priceCents === null}
        onCancel={onCancel}
        onRemove={onRemove}
      />
    </form>
  );
}

function useServiceForm(initial: ServiceInput | undefined) {
  const [name, setName] = useState(initial?.name ?? '');
  const [minutes, setMinutes] = useState(String(initial?.durationMinutes ?? DEFAULT_MINUTES));
  const [price, setPrice] = useState(initial ? centsToInput(initial.priceCents) : NO_PRICE);
  const [visible, setVisible] = useState(initial?.visibleToPatient ?? true);
  const priceCents = parseReais(price);
  const input = (): ServiceInput | null =>
    priceCents === null
      ? null
      : { name, durationMinutes: Number(minutes), priceCents, visibleToPatient: visible };
  const invalidPrice = price !== NO_PRICE && priceCents === null;
  return {
    name,
    setName,
    minutes,
    setMinutes,
    price,
    setPrice,
    visible,
    setVisible,
    priceCents,
    invalidPrice,
    input,
  };
}

function VisibleCheckbox({
  checked,
  onChange,
}: Readonly<{ checked: boolean; onChange: (value: boolean) => void }>) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm">
      <input
        type="checkbox"
        className="size-5 accent-primary"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      {Copy.visible}
    </label>
  );
}

function ServiceNumbers({ form }: Readonly<{ form: ReturnType<typeof useServiceForm> }>) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField
        id="service-minutes"
        label={Copy.duration}
        value={form.minutes}
        onChange={form.setMinutes}
        type="number"
        inputMode="numeric"
        required
        min={1}
        max={MAX_MINUTES}
      />
      <TextField
        id="service-price"
        label={Copy.price}
        value={form.price}
        onChange={form.setPrice}
        inputMode="decimal"
        required
        aria-invalid={form.invalidPrice}
      />
    </div>
  );
}
