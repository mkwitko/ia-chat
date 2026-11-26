import { Check, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BillingCopy } from '../billing/billing-copy';
import { TextField } from '../setup/fields';
import { FindSection } from './find-section';
import type { OnboardingView, Step } from './onboarding-api';
import { OnboardingCopy as Copy } from './onboarding-copy';
import { SpecialtyPicker } from './specialty-picker';
import { TryChat } from './try-chat';

interface AccountStepProps {
  view: OnboardingView;
  document: { value: string; onChange: (value: string) => void };
  onGoTo: (step: Step) => void;
}

/**
 * Step 1 (docs/research/09): where clients find the business (prefill and review), the area
 * chips and the CPF/CNPJ (one trial per document, RF-81). The example chat is one tap away.
 */
export function AccountStep({ view, document, onGoTo }: Readonly<AccountStepProps>) {
  return (
    <div className="grid gap-8">
      <FindSection />
      <SpecialtyPicker view={view} />
      {view.documentSet ? (
        <p className="flex items-center gap-2 text-sm">
          <Check className="size-4 text-ok" aria-hidden="true" />
          {Copy.documentSaved}
        </p>
      ) : (
        <TextField
          id="onboarding-document"
          label={BillingCopy.documentLabel}
          value={document.value}
          onChange={document.onChange}
          inputMode="numeric"
          autoComplete="off"
          hint={BillingCopy.documentHint}
        />
      )}
      <ExampleChat onGoTo={onGoTo} />
    </div>
  );
}

/** The "magic" before the WhatsApp: a test chat with what was saved so far, nothing sent. */
function ExampleChat({ onGoTo }: Readonly<{ onGoTo: (step: Step) => void }>) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-4">
      <Button
        variant="ghost"
        className="justify-self-start px-0 text-jade-ink hover:bg-transparent hover:underline"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
      >
        <MessageCircle aria-hidden="true" />
        {open ? Copy.hideExample : Copy.seeExample}
      </Button>
      {open && <TryChat onGoTo={onGoTo} />}
    </div>
  );
}
