import { Check } from 'lucide-react';
import { BillingCopy } from '../billing/billing-copy';
import { TextField } from '../setup/fields';
import type { OnboardingView } from './onboarding-api';
import { OnboardingCopy as Copy } from './onboarding-copy';
import { SpecialtyPicker } from './specialty-picker';

interface AccountStepProps {
  view: OnboardingView;
  document: string;
  onDocument: (value: string) => void;
}

/** H-37: the CPF/CNPJ (one trial per document, RF-81), then the specialty. Saved on "Continuar". */
export function AccountStep({ view, document, onDocument }: Readonly<AccountStepProps>) {
  return (
    <div className="grid gap-6">
      {view.documentSet ? (
        <p className="flex items-center gap-2 text-sm">
          <Check className="size-4 text-ok" aria-hidden="true" />
          {Copy.documentSaved}
        </p>
      ) : (
        <TextField
          id="onboarding-document"
          label={BillingCopy.documentLabel}
          value={document}
          onChange={onDocument}
          inputMode="numeric"
          autoComplete="off"
          hint={BillingCopy.documentHint}
        />
      )}
      <SpecialtyPicker view={view} />
    </div>
  );
}
