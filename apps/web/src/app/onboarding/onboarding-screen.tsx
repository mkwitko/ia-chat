import { useState } from 'react';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { Screen } from '../screens/screen';
import { Status, Step, useOnboarding, type OnboardingView } from './onboarding-api';
import { OnboardingCopy as Copy, STEP_INFO } from './onboarding-copy';
import { StepPanel } from './step-panel';

const STATUS_LABEL: Record<Status, string> = {
  [Status.done]: Copy.statusDone,
  [Status.skipped]: Copy.statusSkipped,
};

/** Spec 09: eight guided steps, progress saved on the server, resumes where you left. */
export function OnboardingScreen() {
  const onboarding = useOnboarding();
  return (
    <Screen title={Copy.title}>
      <div className="grid gap-4 px-4 pb-10 md:px-0">
        <p className="text-sm text-muted-foreground">{Copy.intro}</p>
        {onboarding.isPending && <ListSkeleton />}
        {onboarding.isError && (
          <LoadError message={Copy.loadFailed} onRetry={() => void onboarding.refetch()} />
        )}
        {onboarding.data && <Steps view={onboarding.data} />}
      </div>
    </Screen>
  );
}

function Steps({ view }: Readonly<{ view: OnboardingView }>) {
  const [picked, setPicked] = useState<Step | null>(null);
  const open = picked ?? view.current;
  return (
    <ol className="grid gap-3">
      {view.steps.map(({ step, status }, index) => (
        <li key={step} className="rounded-xl border bg-card">
          <button
            type="button"
            className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
            aria-expanded={open === step}
            onClick={() => {
              setPicked(open === step ? null : step);
            }}
          >
            <span className="tabular-nums text-muted-foreground">{index + 1}</span>
            <span className="flex-1 font-semibold">{STEP_INFO[step].title}</span>
            <span className="text-sm text-muted-foreground">{statusLabel(step, status)}</span>
          </button>
          {open === step && (
            <StepPanel
              step={step}
              view={view}
              onSettled={() => {
                setPicked(null);
              }}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function statusLabel(step: Step, status: Status | null): string {
  if (status) return STATUS_LABEL[status];
  return STEP_INFO[step].soon ? Copy.statusSoon : '';
}
