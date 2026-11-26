import {
  CircleAlert,
  CircleCheck,
  Clock,
  Lightbulb,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Route } from '@/routes';
import { ProgressBar } from '../screens/progress-bar';
import { ServiceStatus } from '../shell/service-status';
import { useSetupProgress } from '../shell/setup-progress';
import { TrialCopy } from '../shell/trial-copy';
import { useTrial, TrialPhase } from '../shell/trial-api';
import { useServiceAlerts } from '../shell/use-service-alerts';
import { HomeCopy } from './home-copy';
import { StatusKind, topStatus, type StatusAction, type TopStatus } from './status-model';
import { TipCopy, useNextTip } from './use-next-tip';

const Copy = HomeCopy.status;

export function useTopStatus(): TopStatus {
  const alerts = useServiceAlerts();
  const setup = useSetupProgress();
  const trial = useTrial().data;
  const tip = useNextTip();
  return topStatus({
    problems: alerts.map((alert) => ({
      title: alert.message,
      action: { label: alert.action, onAction: alert.onAction },
    })),
    setup: setup && {
      title: Copy.setupTitle(setup.currentTitle),
      done: setup.done,
      total: setup.total,
      action: { label: Copy.setupAction, to: Route.onboarding },
    },
    trialDaysLeft: trial?.phase === TrialPhase.active ? trial.daysLeft : null,
    trialAction: { label: TrialCopy.action, to: Route.usage },
    tip: tip && { title: tip.title, action: { label: TipCopy.open, to: tip.to } },
  });
}

const ICON: Record<StatusKind, LucideIcon> = {
  [StatusKind.problem]: CircleAlert,
  [StatusKind.setup]: ListChecks,
  [StatusKind.trialEnding]: Clock,
  [StatusKind.tip]: Lightbulb,
  [StatusKind.ok]: CircleCheck,
};

function titleOf(status: TopStatus): string {
  switch (status.kind) {
    case StatusKind.problem:
    case StatusKind.setup:
      return status.title;
    case StatusKind.trialEnding:
      return TrialCopy.endingTitle(status.daysLeft);
    case StatusKind.tip:
      return Copy.tipTitle;
    case StatusKind.ok:
      return Copy.okTitle;
    default:
      return status satisfies never;
  }
}

function Detail({ status }: Readonly<{ status: TopStatus }>) {
  if (status.kind === StatusKind.setup) {
    const label = Copy.setupProgress(status.done, status.total);
    return (
      <div className="flex items-center gap-3">
        <ProgressBar
          value={status.done}
          total={status.total}
          label={label}
          className="max-w-56 flex-1"
        />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    );
  }
  if (status.kind === StatusKind.trialEnding)
    return <p className="text-muted-foreground">{TrialCopy.endingBody}</p>;
  if (status.kind === StatusKind.tip) return <p>{status.title}</p>;
  return null;
}

function ActionButton({ action, strong }: Readonly<{ action: StatusAction; strong: boolean }>) {
  const variant = strong ? 'default' : 'outline';
  if (action.to)
    return (
      <Button asChild variant={variant} className="w-full @lg:w-auto">
        <Link to={action.to}>{action.label}</Link>
      </Button>
    );
  return (
    <Button variant={variant} className="w-full @lg:w-auto" onClick={action.onAction}>
      {action.label}
    </Button>
  );
}

/** Início's one status area: the most important thing, its button, and the service in words. */
export function StatusCard({ status }: Readonly<{ status: TopStatus }>) {
  const Icon = ICON[status.kind];
  const problem = status.kind === StatusKind.problem;
  const strong = problem || status.kind === StatusKind.setup;
  return (
    <section
      aria-label={Copy.label}
      role={problem ? 'alert' : undefined}
      className={cn(
        '@container mx-4 mb-8 grid gap-4 rounded-xl border bg-card p-5 shadow-card md:mx-0',
        problem && 'border-danger/40 bg-danger-soft',
      )}
    >
      <div className="grid gap-4 @lg:grid-cols-[minmax(0,1fr)_auto] @lg:items-center @lg:gap-x-8">
        <div className="grid gap-2">
          <h2 className="flex items-start gap-2.5 text-lg">
            <Icon
              className={cn(
                'mt-1 size-5 shrink-0',
                problem ? 'text-danger' : 'text-muted-foreground',
              )}
              aria-hidden="true"
            />
            <span>{titleOf(status)}</span>
          </h2>
          <div className="pl-7.5">
            <Detail status={status} />
          </div>
        </div>
        {status.kind !== StatusKind.ok && <ActionButton action={status.action} strong={strong} />}
      </div>
      <ServiceStatus
        inline
        className="border-t pt-4 @lg:flex @lg:flex-wrap @lg:gap-x-8 [&_li]:text-sm"
      />
    </section>
  );
}
