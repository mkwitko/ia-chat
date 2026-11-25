import { useMetaOverview } from './operator-api';
import { OperatorCopy } from './operator-copy';

const Copy = OperatorCopy.meta;

/** H-05: Meta usage across tenants. Totals and the top tenants by estimated cost; counts only. */
export function MetaPanel() {
  const meta = useMetaOverview().data;
  if (!meta) return null;
  const { totals } = meta;
  return (
    <section aria-label={Copy.heading} className="rounded-xl border bg-card p-4">
      <h2 className="mb-1 text-base font-semibold">{Copy.heading}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{Copy.hint}</p>
      <ul className="grid gap-1 text-sm tabular-nums">
        <li>{Copy.service(totals.serviceUsed, totals.serviceOver)}</li>
        <li>{Copy.templates(totals.utilityBillable, totals.marketingBillable)}</li>
        <li className="font-medium">{Copy.total(totals.estimatedCostCents)}</li>
      </ul>
      <h3 className="mt-3 mb-1 text-sm font-medium">{Copy.topHeading}</h3>
      {meta.top.length === 0 && <p className="text-sm">{Copy.none}</p>}
      <ol className="grid gap-1 text-sm tabular-nums">
        {meta.top.map((row) => (
          <li key={row.id}>{Copy.topLine(row.name, row.estimatedCostCents, row.serviceUsed)}</li>
        ))}
      </ol>
    </section>
  );
}
