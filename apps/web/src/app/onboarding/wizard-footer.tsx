import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { onDocumentError } from '../billing/document-form';
import { useSaveDocument } from '../billing/billing-api';
import { notifySaveError } from '../setup/feedback';
import {
  Status,
  StepBlock,
  useRefreshOnboarding,
  useSaveStep,
  type OnboardingView,
} from './onboarding-api';
import { OnboardingCopy } from './onboarding-copy';
import { WizardCopy as Copy } from './wizard-copy';
import { Page, settlesStep, SKIPPABLE, stepOf } from './wizard-model';

const BLOCK_MESSAGE: Readonly<Record<string, string>> = {
  [StepBlock.documentRequired]: OnboardingCopy.documentRequired,
  [StepBlock.whatsappNotConnected]: OnboardingCopy.whatsappRequired,
  [StepBlock.hoursRequired]: OnboardingCopy.hoursRequired,
};

function onSaveError(error: Error) {
  const message = error instanceof ApiError && error.code ? BLOCK_MESSAGE[error.code] : undefined;
  if (message) notifyError(message);
  else notifySaveError(error);
}

const hasText = (value: string) => value.trim().length > 0;

/** "Continuar" stays off until the screen has what it needs (H-22: activation needs the WhatsApp). */
export function isReady(page: Page, view: OnboardingView, document: string): boolean {
  if (page === Page.area) return !!view.specialty;
  if (page === Page.document) return view.documentSet || hasText(document);
  if (page === Page.whatsapp || page === Page.activation) return view.whatsappConnected;
  return true;
}

interface AdvanceInput {
  page: Page;
  view: OnboardingView;
  onNext: () => void;
}

/** Moves on: screens inside the first step just advance; the others save their step first. */
export function useAdvance({ page, view, onNext }: AdvanceInput) {
  const save = useSaveStep();
  const saveDocument = useSaveDocument();
  const refresh = useRefreshOnboarding();
  const settle = (status: Status) => {
    save.mutate({ step: stepOf(page), status }, { onSuccess: onNext, onError: onSaveError });
  };
  async function documentSaved(document: string): Promise<boolean> {
    if (page !== Page.document || view.documentSet) return true;
    try {
      await saveDocument.mutateAsync(document.trim());
      refresh();
      return true;
    } catch (error) {
      if (error instanceof Error) onDocumentError(error);
      return false;
    }
  }
  const next = async (document: string) => {
    if (!settlesStep(page)) {
      onNext();
      return;
    }
    if (await documentSaved(document)) settle(Status.done);
  };
  // A screen that confirmed with its own button (hours, the found data) is done.
  const finish = () => {
    if (settlesStep(page)) settle(Status.done);
    else onNext();
  };
  // The WhatsApp is the one step the server lets wait; the others just move on.
  const skip = () => {
    if (page === Page.whatsapp) settle(Status.skipped);
    else finish();
  };
  return { next, skip, finish, pending: save.isPending || saveDocument.isPending };
}

interface FooterProps {
  page: Page;
  view: OnboardingView;
  ready: boolean;
  pending: boolean;
  onBack: (() => void) | null;
  onSkip: () => void;
  onNext: () => void;
  /** Activation without the WhatsApp: the way forward is connecting it. */
  onConnect: () => void;
}

/** The filled button: "Continuar", "Ligar o assistente", or "Conectar o WhatsApp" when it is missing. */
function PrimaryAction(props: Readonly<FooterProps>) {
  const { page, view, ready, pending, onNext, onConnect } = props;
  // Hours (until saved once) and "where clients find you" confirm with their own button.
  if (page === Page.find || (page === Page.hours && !view.hoursSet)) return null;
  if (page === Page.activation && !view.whatsappConnected)
    return (
      <Button size="lg" className="sm:min-w-48" onClick={onConnect}>
        {Copy.connectWhatsapp}
      </Button>
    );
  return (
    <Button size="lg" className="sm:min-w-48" disabled={pending || !ready} onClick={onNext}>
      {page === Page.activation ? Copy.activate : Copy.next}
    </Button>
  );
}

/** One big filled button; "Voltar" and "Pular por agora" stay quiet. */
export function WizardFooter(props: Readonly<FooterProps>) {
  const { page, pending, onBack, onSkip } = props;
  return (
    <footer className="grid gap-2 border-t pt-5 sm:flex sm:flex-row-reverse sm:items-center">
      <PrimaryAction {...props} />
      {SKIPPABLE.has(page) && !(page === Page.whatsapp && props.view.whatsappConnected) && (
        <Button size="lg" variant="ghost" disabled={pending} onClick={onSkip}>
          {Copy.skip}
        </Button>
      )}
      {onBack && (
        <Button size="lg" variant="ghost" className="sm:mr-auto" onClick={onBack}>
          {Copy.back}
        </Button>
      )}
    </footer>
  );
}
