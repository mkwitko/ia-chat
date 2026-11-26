import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Status, type OnboardingView, type Step } from './onboarding-api';
import { OnboardingCopy as Copy, STEP_INFO } from './onboarding-copy';

export const STATUS_LABEL: Record<Status, string> = {
  [Status.done]: Copy.statusDone,
  [Status.skipped]: Copy.statusSkipped,
};

interface RailProps {
  view: OnboardingView;
  open: Step;
  onPick: (step: Step) => void;
}

/**
 * From lg: the six steps beside the open one. Settled steps and the current one open; the ones
 * ahead stay in order (H-39), so they show but do not open.
 */
export function StepRail({ view, open, onPick }: Readonly<RailProps>) {
  return (
    <ol className="hidden gap-1 lg:sticky lg:top-8 lg:grid" aria-label={Copy.title}>
      {view.steps.map(({ step, status }, index) => {
        const reachable = status !== null || step === view.current;
        const isOpen = step === open;
        return (
          <li key={step}>
            <button
              type="button"
              disabled={!reachable}
              aria-current={isOpen ? 'step' : undefined}
              onClick={() => {
                onPick(step);
              }}
              className={cn(
                'flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors',
                'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                'disabled:cursor-default disabled:text-muted-foreground disabled:hover:bg-transparent',
                isOpen && 'bg-card font-medium shadow-card',
              )}
            >
              <StepMark index={index} status={status} isOpen={isOpen} />
              <span className="min-w-0 flex-1 truncate">{STEP_INFO[step].title}</span>
              {status && (
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepMark({
  index,
  status,
  isOpen,
}: Readonly<{ index: number; status: Status | null; isOpen: boolean }>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full border text-xs tabular-nums',
        status === Status.done && 'border-jade bg-jade text-card',
        isOpen && status !== Status.done && 'border-foreground text-foreground',
      )}
    >
      {status === Status.done ? <Check className="size-3.5" strokeWidth={2.5} /> : index + 1}
    </span>
  );
}
