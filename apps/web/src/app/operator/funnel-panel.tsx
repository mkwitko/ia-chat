import { STEP_INFO } from '../onboarding/onboarding-copy';
import { useFunnel } from './operator-api';
import { OperatorCopy as Copy } from './operator-copy';

/** RF-86: how many accounts settled each step of the guided setup. Aggregates only. */
export function FunnelPanel() {
  const funnel = useFunnel().data;
  if (!funnel) return null;
  return (
    <section aria-label={Copy.funnel.heading} className="rounded-xl border bg-card p-4">
      <h2 className="mb-1 text-base font-semibold">{Copy.funnel.heading}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{Copy.funnel.signups(funnel.signups)}</p>
      <ol className="grid gap-2 text-sm tabular-nums">
        {funnel.steps.map(({ step, count }) => (
          <li key={step} className="grid gap-1">
            <span>
              {STEP_INFO[step].title}: {Copy.funnel.line(count, funnel.signups)}
            </span>
            <progress
              className="h-2 w-full"
              max={Math.max(funnel.signups, 1)}
              value={count}
              aria-label={STEP_INFO[step].title}
            />
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">{Copy.funnel.goal}</p>
    </section>
  );
}
