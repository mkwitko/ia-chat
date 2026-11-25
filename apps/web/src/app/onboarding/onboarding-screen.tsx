import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { Screen } from '../screens/screen';
import { Status, Step, useOnboarding, type OnboardingView } from './onboarding-api';
import { OnboardingCopy as Copy, STEP_INFO } from './onboarding-copy';
import { StepPanel } from './step-panel';

const STATUS_LABEL: Record<Status, string> = {
  [Status.done]: Copy.statusDone,
  [Status.skipped]: Copy.statusSkipped,
};
const PERCENT = 100;

/**
 * Spec 09/10 and H-37: one guided flow, one step at a time, in order (CPF/CNPJ, WhatsApp, Google,
 * services, simulator, activation), with a progress bar, a way back, and progress saved on the server.
 */
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
  return (
    <section
      className="grid gap-3 rounded-xl border bg-card px-4 pt-4"
      aria-labelledby="step-title"
    >
      <Progress index={index + 1} total={steps.length} />
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
      />
      {previous && (
        <Button
          variant="ghost"
          className="mb-3 justify-self-start"
          onClick={() => {
            setPicked(previous);
          }}
        >
          {Copy.back}
        </Button>
      )}
    </section>
  );
}

function Progress({ index, total }: Readonly<{ index: number; total: number }>) {
  const label = Copy.progress(index, total);
  return (
    <div className="grid gap-1">
      <span className="text-sm text-muted-foreground tabular-nums">{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full bg-primary"
          style={{ width: `${String((index / total) * PERCENT)}%` }}
        />
      </div>
    </div>
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
