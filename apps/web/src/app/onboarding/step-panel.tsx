import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { DocumentForm } from '../billing/document-form';
import { notifySaveError } from '../setup/feedback';
import { WhatsappSection } from '../whatsapp/whatsapp-section';
import {
  Status,
  Step,
  StepBlock,
  useRefreshOnboarding,
  useSaveStep,
  type OnboardingView,
} from './onboarding-api';
import { OnboardingCopy as Copy, STEP_INFO } from './onboarding-copy';
import { SpecialtyPicker } from './specialty-picker';

interface PanelProps {
  step: Step;
  view: OnboardingView;
  onSettled: () => void;
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

/** What a step shows when opened: the explanation, the screen that does the work, the buttons. */
export function StepPanel({ step, view, onSettled }: Readonly<PanelProps>) {
  const info = STEP_INFO[step];
  const save = useSaveStep();
  const settle = (status: Status) => {
    save.mutate({ step, status }, { onSuccess: onSettled, onError: onSaveError });
  };
  // H-22: the assistant is activated only with the WhatsApp connected.
  const locked = step === Step.activation && !view.whatsappConnected;
  return (
    <div className="grid gap-3 py-4">
      <p className="text-sm">{info.text}</p>
      {step === Step.account && <AccountStep view={view} />}
      {step === Step.simulator && <p className="text-sm text-muted-foreground">{Copy.testNote}</p>}
      {step === Step.whatsapp && (
        <WhatsappStep
          onSkip={() => {
            settle(Status.skipped);
          }}
        />
      )}
      {locked && <LockedNote />}
      {info.to && (
        <Button asChild variant="outline">
          <Link to={info.to}>{info.openLabel}</Link>
        </Button>
      )}
      <Button
        variant={info.soon ? 'outline' : 'default'}
        disabled={save.isPending || locked}
        onClick={() => {
          settle(info.soon ? Status.skipped : Status.done);
        }}
      >
        {actionLabel(step)}
      </Button>
    </div>
  );
}

function actionLabel(step: Step): string {
  if (STEP_INFO[step].soon) return Copy.skip;
  return step === Step.activation ? Copy.activate : Copy.next;
}

/** H-37: the CPF/CNPJ comes first (one trial per document, RF-81), then the specialty. */
function AccountStep({ view }: Readonly<{ view: OnboardingView }>) {
  const refresh = useRefreshOnboarding();
  return (
    <>
      {!view.documentSet && (
        <>
          <p className="text-sm text-muted-foreground">{Copy.documentFirst}</p>
          <DocumentForm onSaved={refresh} />
        </>
      )}
      <SpecialtyPicker view={view} />
    </>
  );
}

const LockedNote = () => (
  <p className="rounded-lg bg-attention-soft px-3 py-2 text-sm">{Copy.activationNeedsWhatsapp}</p>
);

/** The connection lives in its own section; the step can still be left for later. */
function WhatsappStep({ onSkip }: Readonly<{ onSkip: () => void }>) {
  return (
    <>
      <WhatsappSection />
      <Button variant="outline" onClick={onSkip}>
        {Copy.skipWhatsapp}
      </Button>
    </>
  );
}
