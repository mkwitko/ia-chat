import { useMetaUsage, type MetaUsage } from './usage-api';
import { UsageCopy } from './usage-copy';

const Copy = UsageCopy.meta;
const FULL_PERCENT = 100;

/** H-05: how much of Meta's free allowance was used. Information only: we pay Meta (H-05). */
export function MetaBlock() {
  const meta = useMetaUsage();
  return (
    <section aria-label={Copy.heading} className="grid gap-3 px-4 md:px-0">
      <h2 className="text-lg">{Copy.heading}</h2>
      {meta.isError && <p className="text-sm text-muted-foreground">{Copy.loadFailed}</p>}
      {meta.data && <MetaDetails meta={meta.data} />}
      <p className="text-sm text-muted-foreground">{Copy.note}</p>
    </section>
  );
}

function MetaDetails({ meta }: Readonly<{ meta: MetaUsage }>) {
  const percent = Math.min(
    Math.round((meta.serviceUsed / meta.serviceFree) * FULL_PERCENT),
    FULL_PERCENT,
  );
  return (
    <div className="grid gap-2 text-sm tabular-nums">
      <p className="text-base font-semibold">{Copy.freeLine(meta.serviceUsed, meta.serviceFree)}</p>
      <progress
        className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
        max={FULL_PERCENT}
        value={percent}
        aria-label={Copy.barLabel}
      />
      {meta.serviceOver > 0 && <p>{Copy.over(meta.serviceOver)}</p>}
      {meta.billable.utility > 0 && <p>{Copy.utility(meta.billable.utility)}</p>}
      {meta.billable.marketing > 0 && <p>{Copy.marketing(meta.billable.marketing)}</p>}
      {meta.estimatedCostCents > 0 && <p>{Copy.estimate(meta.estimatedCostCents)}</p>}
    </div>
  );
}
