import { Check, Smartphone } from 'lucide-react';
import { useEffect } from 'react';
import { useWhatsappStatus } from '../whatsapp/whatsapp-api';
import { BillingCopy } from '../billing/billing-copy';
import { TextField } from '../setup/fields';
import { WhatsappConnect } from '../whatsapp/whatsapp-section';
import { ActivationStep } from './activation-step';
import { FindSection } from './find-section';
import { HoursStep } from './hours-step';
import { useRefreshOnboarding, type OnboardingView, type Step } from './onboarding-api';
import { OnboardingCopy } from './onboarding-copy';
import { ServicesStep } from './services-step';
import { SpecialtyPicker } from './specialty-picker';
import { TryChat } from './try-chat';
import { WizardCopy } from './wizard-copy';
import { Page } from './wizard-model';

export interface PageBodyProps {
  page: Page;
  view: OnboardingView;
  document: { value: string; onChange: (value: string) => void };
  /** For the screens that confirm with their own button (hours, the found data). */
  onDone: () => void;
  /** "Ajustar" in the test chat. */
  onGoTo: (step: Step) => void;
}

/** The work of one screen, done right there: no detour to another page. */
export function PageBody(props: Readonly<PageBodyProps>) {
  const { page, view, onDone, onGoTo } = props;
  switch (page) {
    case Page.area:
      return <SpecialtyPicker view={view} />;
    case Page.find:
      return <FindSection onApplied={onDone} />;
    case Page.document:
      return <DocumentField view={view} document={props.document} />;
    case Page.whatsapp:
      return <WhatsappPage />;
    case Page.services:
      return <ServicesStep view={view} />;
    case Page.hours:
      return <HoursStep onDone={onDone} />;
    case Page.simulator:
      return <TryChat onGoTo={onGoTo} />;
    case Page.activation:
      return <ActivationStep view={view} />;
    default: {
      const never: never = page;
      return never;
    }
  }
}

function DocumentField({ view, document }: Readonly<Pick<PageBodyProps, 'view' | 'document'>>) {
  if (view.documentSet)
    return (
      <p className="flex items-center gap-2 text-base">
        <Check className="size-5 text-ok" aria-hidden="true" />
        {WizardCopy.documentSaved}
      </p>
    );
  return (
    <TextField
      id="onboarding-document"
      label={BillingCopy.documentLabel}
      value={document.value}
      onChange={document.onChange}
      inputMode="numeric"
      autoComplete="off"
    />
  );
}

/** Connect only: the history import waits in Meu consultório › WhatsApp. */
function WhatsappPage() {
  const ready = useWhatsappStatus().data?.channel?.ready;
  const refresh = useRefreshOnboarding();
  // The wizard's "Continuar" reads the onboarding view: tell it when the number connects.
  // Only when the state flips: refresh() is a new function on every render.
  useEffect(() => {
    refresh();
  }, [ready]);
  return (
    <div className="grid gap-6">
      <WhatsappConnect withHistory={false} />
      <p className="flex gap-3 text-sm text-muted-foreground">
        <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {OnboardingCopy.phoneHint}
      </p>
    </div>
  );
}
