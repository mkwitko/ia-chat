import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { centsToInput, parseReais } from '@/lib/money';
import { FormActions, TextField } from '../setup/fields';
import { useSaveCap, type Usage } from './usage-api';
import { UsageCopy as Copy } from './usage-copy';

const FORBIDDEN = 403;
const NO_CAP = '';

function onSaveError(error: Error) {
  const forbidden = error instanceof ApiError && error.status === FORBIDDEN;
  toast.error(forbidden ? Copy.capForbidden : Copy.capSaveFailed);
}

/** Owner's overage cap, typed in reais and stored in cents; blank means no cap. */
export function CapForm({ usage }: Readonly<{ usage: Usage }>) {
  const [text, setText] = useState(usage.capCents === null ? NO_CAP : centsToInput(usage.capCents));
  const save = useSaveCap();
  const typed = text.trim() === NO_CAP ? null : parseReais(text);
  const invalid = text.trim() !== NO_CAP && typed === null;
  return (
    <form
      className="grid gap-3 px-4 md:px-0"
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid) return;
        save.mutate(typed, { onSuccess: () => toast.success(Copy.capSaved), onError: onSaveError });
      }}
    >
      <h2 className="text-lg">{Copy.capHeading}</h2>
      <TextField
        id="usage-cap"
        label={Copy.capLabel}
        value={text}
        onChange={setText}
        inputMode="decimal"
        placeholder={Copy.capPlaceholder}
        hint={Copy.capHint}
        aria-invalid={invalid}
      />
      {invalid && (
        <p role="alert" className="text-sm text-destructive">
          {Copy.capInvalid}
        </p>
      )}
      <p className="text-sm tabular-nums">{Copy.capCurrent(usage.capCents)}</p>
      <FormActions pending={save.isPending} disabled={invalid} />
    </form>
  );
}
