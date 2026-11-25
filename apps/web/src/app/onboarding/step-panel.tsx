import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { notifySaveError } from '../setup/feedback';
import { Status, Step, useSaveStep, type OnboardingView } from './onboarding-api';
import { OnboardingCopy as Copy, STEP_INFO } from './onboarding-copy';
import { SpecialtyPicker } from './specialty-picker';

interface PanelProps {
  step: Step;
  view: OnboardingView;
  onSettled: () => void;
}

/** What a step shows when opened: the explanation, the screen that does the work, the buttons. */
export function StepPanel({ step, view, onSettled }: Readonly<PanelProps>) {
  const info = STEP_INFO[step];
  const save = useSaveStep();
  const settle = (status: Status) => {
    save.mutate({ step, status }, { onSuccess: onSettled, onError: notifySaveError });
  };
  return (
    <div className="grid gap-3 border-t px-4 py-4">
      <p className="text-sm">{info.text}</p>
      {step === Step.account && <SpecialtyPicker view={view} />}
      {step === Step.simulator && <p className="text-sm text-muted-foreground">{Copy.testNote}</p>}
      {info.to && (
        <Button asChild variant="outline">
          <Link to={info.to}>{info.openLabel}</Link>
        </Button>
      )}
      <Button
        variant={info.soon ? 'outline' : 'default'}
        disabled={save.isPending}
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
