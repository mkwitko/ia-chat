import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { FormActions, TextField } from '../setup/fields';
import { useSaveDocument } from './billing-api';
import { BillingCopy as Copy } from './billing-copy';

const EMPTY = '';
const Status = { badRequest: 400, forbidden: 403, conflict: 409 } as const;

export function onDocumentError(error: Error) {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === Status.conflict) toast.error(Copy.documentTaken);
  else if (status === Status.badRequest) toast.error(Copy.documentInvalid);
  else toast.error(status === Status.forbidden ? Copy.forbidden : Copy.failed);
}

/** RF-81: CPF or CNPJ, one trial per document. In Assinatura and in the first onboarding step. */
export function DocumentForm({ onSaved }: Readonly<{ onSaved?: () => void }>) {
  const [value, setValue] = useState(EMPTY);
  const save = useSaveDocument();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(value, {
          onSuccess: () => {
            toast.success(Copy.documentSaved);
            onSaved?.();
          },
          onError: onDocumentError,
        });
      }}
    >
      <TextField
        id="billing-document"
        label={Copy.documentLabel}
        value={value}
        onChange={setValue}
        inputMode="numeric"
        hint={Copy.documentHint}
      />
      <FormActions pending={save.isPending} disabled={value.trim() === EMPTY} />
    </form>
  );
}
