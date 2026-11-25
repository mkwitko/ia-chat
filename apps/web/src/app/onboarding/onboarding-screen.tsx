import { useState } from 'react';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { ProgressBar } from '../screens/progress-bar';
import { Screen, ScreenWidth } from '../screens/screen';
import { Status, Step, useOnboarding, type OnboardingView } from './onboarding-api';
import { OnboardingCopy as Copy, STEP_INFO } from './onboarding-copy';
import { StepPanel } from './step-panel';

const STATUS_LABEL: Record<Status, string> = {
  [Status.done]: Copy.statusDone,
  [Status.skipped]: Copy.statusSkipped,
};

/**
 * Spec 09/10 and H-37: one guided flow, one step at a time, in order (CPF/CNPJ, WhatsApp, Google,
 * services, simulator, activation), with a progress bar, a way back, and progress saved on the server.
 */
export function OnboardingScreen() {
  const onboarding = useOnboarding();
  return (
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <div className="grid gap-4 px-4 pb-10 md:px-0">
        <p className="text-sm text-muted-foreground">{Copy.intro}</p>
        {onboarding.isPending && <ListSkeleton />}
        {onboarding.isError && (
          <LoadError message={Copy.loadFailed} onRetry={() => void onboarding.refetch()} />
        )}
        {onboarding.data && <Flow view={onboarding.data} />}
      </div>
    </Screen>
  );
}

function Flow({ view }: Readonly<{ view: OnboardingView }>) {
  const [picked, setPicked] = useState<Step | null>(null);
  const open = picked ?? view.current;
  const steps = view.steps.map(({ step }) => step);
  if (!open) return <Summary view={view} onPick={setPicked} />;
  const index = steps.indexOf(open);
  const previous = steps[index - 1];
  const label = Copy.progress(index + 1, steps.length);
  return (
    <section
      className="grid gap-5 rounded-xl border bg-card p-4 shadow-card md:p-6"
      aria-labelledby="step-title"
    >
      <div className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <ProgressBar value={index + 1} total={steps.length} label={label} />
      </div>
      <h2 id="step-title" className="text-lg">
        {STEP_INFO[open].title}
      </h2>
      <StepPanel
        key={open}
        step={open}
        view={view}
        onSettled={() => {
          setPicked(null);
        }}
        onBack={
          previous
            ? () => {
                setPicked(previous);
              }
            : null
        }
      />
    </section>
  );
}

/** Everything settled: the steps stay reachable for a review. */
function Summary({
  view,
  onPick,
}: Readonly<{ view: OnboardingView; onPick: (step: Step) => void }>) {
  return (
    <div className="grid gap-3">
      <p role="status">{Copy.allDone}</p>
      <ol className="grid gap-2">
        {view.steps.map(({ step, status }, index) => (
          <li key={step}>
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 rounded-xl border bg-card px-4 text-left"
              onClick={() => {
                onPick(step);
              }}
            >
              <span className="tabular-nums text-muted-foreground">{index + 1}</span>
              <span className="flex-1 font-semibold">{STEP_INFO[step].title}</span>
              <span className="text-sm text-muted-foreground">
                {status ? STATUS_LABEL[status] : ''}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
