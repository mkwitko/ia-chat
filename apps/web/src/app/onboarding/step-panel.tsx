import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { onDocumentError } from '../billing/document-form';
import { useSaveDocument } from '../billing/billing-api';
import { notifySaveError } from '../setup/feedback';
import {
  Status,
  Step,
  StepBlock,
  useRefreshOnboarding,
  useSaveStep,
  type OnboardingView,
} from './onboarding-api';
import { OnboardingCopy as Copy } from './onboarding-copy';
import { StepBody } from './step-body';

interface PanelProps {
  step: Step;
  view: OnboardingView;
  onSettled: () => void;
  onBack: (() => void) | null;
  /** "Ajustar" in the test chat opens the step that holds the field. */
  onGoTo: (step: Step) => void;
}

const BLOCK_MESSAGE: Readonly<Record<string, string>> = {
  [StepBlock.documentRequired]: Copy.documentRequired,
  [StepBlock.whatsappNotConnected]: Copy.whatsappRequired,
  [StepBlock.hoursRequired]: Copy.hoursRequired,
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
function useAdvance({ step, view, onSettled }: Pick<PanelProps, 'step' | 'view' | 'onSettled'>) {
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
    if (await documentSaved(document)) settle(Status.done);
  };
  return { advance, settle, pending: save.isPending || saveDocument.isPending };
}

/** One step: what it is for, the work itself, and a single "Continuar" that saves and advances. */
export function StepPanel({ step, view, onSettled, onBack, onGoTo }: Readonly<PanelProps>) {
  const [document, setDocument] = useState('');
  const { advance, settle, pending } = useAdvance({ step, view, onSettled });
  return (
    <div className="grid gap-6">
      <StepBody
        step={step}
        view={view}
        document={{ value: document, onChange: setDocument }}
        onDone={() => {
          settle(Status.done);
        }}
        onGoTo={onGoTo}
      />
      <StepFooter
        step={step}
        view={view}
        pending={pending}
        ready={isReady(step, view, document)}
        onBack={onBack}
        onSkip={() => {
          settle(Status.skipped);
        }}
        onNext={() => void advance(document)}
      />
    </div>
  );
}

interface FooterProps {
  step: Step;
  view: OnboardingView;
  pending: boolean;
  ready: boolean;
  onBack: (() => void) | null;
  onSkip: () => void;
  onNext: () => void;
}

function StepFooter(props: Readonly<FooterProps>) {
  const { step, view, pending, ready, onBack, onSkip, onNext } = props;
  // The hours step confirms its grid with its own button, which also advances.
  const ownSubmit = step === Step.hours;
  return (
    <footer className="flex flex-wrap items-center gap-2 border-t pt-4">
      {onBack && (
        <Button variant="ghost" onClick={onBack}>
          {Copy.back}
        </Button>
      )}
      {step === Step.whatsapp && !view.whatsappConnected && (
        <Button variant="ghost" disabled={pending} onClick={onSkip}>
          {Copy.skipWhatsapp}
        </Button>
      )}
      {!ownSubmit && (
        <Button className="ml-auto" disabled={pending || !ready} onClick={onNext}>
          {step === Step.activation ? Copy.activate : Copy.next}
        </Button>
      )}
    </footer>
  );
}
