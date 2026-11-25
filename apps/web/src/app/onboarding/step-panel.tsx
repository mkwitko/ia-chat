import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { onDocumentError } from '../billing/document-form';
import { useSaveDocument } from '../billing/billing-api';
import { notifySaveError } from '../setup/feedback';
import { WhatsappSection } from '../whatsapp/whatsapp-section';
import { AccountStep } from './account-step';
import {
  Status,
  Step,
  StepBlock,
  useRefreshOnboarding,
  useSaveStep,
  type OnboardingView,
} from './onboarding-api';
import { OnboardingCopy as Copy, STEP_INFO } from './onboarding-copy';

interface PanelProps {
  step: Step;
  view: OnboardingView;
  onSettled: () => void;
  onBack: (() => void) | null;
}

const BLOCK_MESSAGE: Readonly<Record<string, string>> = {
  [StepBlock.documentRequired]: Copy.documentRequired,
  [StepBlock.whatsappNotConnected]: Copy.whatsappRequired,
};

function onSaveError(error: Error) {
  const message = error instanceof ApiError && error.code ? BLOCK_MESSAGE[error.code] : undefined;
  if (message) toast.error(message);
  else notifySaveError(error);
}

const hasText = (value: string) => value.trim().length > 0;

/** "Continuar" stays off until the step has what it needs (H-22: activation needs the WhatsApp). */
function isReady(step: Step, view: OnboardingView, document: string): boolean {
  if (step === Step.account) return (view.documentSet || hasText(document)) && !!view.specialty;
  if (step === Step.whatsapp || step === Step.activation) return view.whatsappConnected;
  return true;
}

/** Saves what the step holds (the CPF/CNPJ on the first one), then the step itself. */
function useAdvance({ step, view, onSettled }: Omit<PanelProps, 'onBack'>) {
  const save = useSaveStep();
  const saveDocument = useSaveDocument();
  const refresh = useRefreshOnboarding();
  const settle = (status: Status) => {
    save.mutate({ step, status }, { onSuccess: onSettled, onError: onSaveError });
  };
  async function documentSaved(document: string): Promise<boolean> {
    if (step !== Step.account || view.documentSet) return true;
    try {
      await saveDocument.mutateAsync(document.trim());
      refresh();
      return true;
    } catch (error) {
      if (error instanceof Error) onDocumentError(error);
      return false;
    }
  }
  const advance = async (document: string) => {
    if (await documentSaved(document)) settle(STEP_INFO[step].soon ? Status.skipped : Status.done);
  };
  return { advance, settle, pending: save.isPending || saveDocument.isPending };
}

/** One step: what it is for, the work itself, and a single "Continuar" that saves and advances. */
export function StepPanel({ step, view, onSettled, onBack }: Readonly<PanelProps>) {
  const [document, setDocument] = useState('');
  const { advance, settle, pending } = useAdvance({ step, view, onSettled });
  return (
    <div className="grid gap-5">
      <StepBody step={step} view={view} document={document} onDocument={setDocument} />
      <footer className="flex flex-wrap items-center gap-2 border-t pt-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            {Copy.back}
          </Button>
        )}
        {step === Step.whatsapp && !view.whatsappConnected && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              settle(Status.skipped);
            }}
          >
            {Copy.skipWhatsapp}
          </Button>
        )}
        <Button
          className="ml-auto"
          disabled={pending || !isReady(step, view, document)}
          onClick={() => void advance(document)}
        >
          {step === Step.activation ? Copy.activate : Copy.next}
        </Button>
      </footer>
    </div>
  );
}

interface BodyProps {
  step: Step;
  view: OnboardingView;
  document: string;
  onDocument: (value: string) => void;
}

/** The work of the step: its own fields, or a link to the screen that does it. */
function StepBody({ step, view, document, onDocument }: Readonly<BodyProps>) {
  const info = STEP_INFO[step];
  return (
    <>
      <p className="text-base text-muted-foreground">{info.text}</p>
      {step === Step.account && (
        <AccountStep view={view} document={document} onDocument={onDocument} />
      )}
      {step === Step.whatsapp && <WhatsappSection />}
      {step === Step.simulator && <p className="text-sm text-muted-foreground">{Copy.testNote}</p>}
      {step === Step.activation && !view.whatsappConnected && (
        <p className="rounded-lg border bg-attention-soft px-3 py-2 text-sm">
          {Copy.activationNeedsWhatsapp}
        </p>
      )}
      {info.to && (
        <Button asChild variant="outline" className="justify-self-start">
          <Link to={info.to}>{info.openLabel}</Link>
        </Button>
      )}
    </>
  );
}
