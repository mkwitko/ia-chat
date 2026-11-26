import { Check, ChevronRight, CircleAlert, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { StatusCopy } from '../clinic/clinic-copy';
import { TopicStatus, type TopicSummary } from '../clinic/clinic-model';

/** One topic of a settings summary; `summary` is undefined while it loads, null to hide the row. */
export interface SummaryItem {
  label: string;
  to: string;
  icon: LucideIcon;
  summary: TopicSummary | null | undefined;
}

const ROW =
  'group flex min-h-20 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:px-5';

/**
 * The settings summary pattern (owner, 26/11/2026): one row per topic with its value in plain words
 * and a status. The first topic still to set up carries the page's one filled button.
 */
export function SummaryList({ items }: Readonly<{ items: readonly SummaryItem[] }>) {
  const shown = items.filter((item) => item.summary !== null);
  const next = shown.find((item) => item.summary?.status === TopicStatus.todo);
  return (
    <ul className="divide-y overflow-hidden border-y bg-card md:rounded-xl md:border md:shadow-card">
      {shown.map((item) => (
        <li key={item.to}>
          <SummaryRow item={item} next={item === next} />
        </li>
      ))}
    </ul>
  );
}

function SummaryRow({ item, next }: Readonly<{ item: SummaryItem; next: boolean }>) {
  const Icon = item.icon;
  const status = item.summary?.status;
  return (
    <Link to={item.to} className={ROW}>
      <Icon
        className="size-5 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="text-base font-medium">{item.label}</span>
        <Value summary={item.summary} />
      </span>
      <Action next={next} status={status} />
    </Link>
  );
}

function Value({ summary }: Readonly<{ summary: TopicSummary | undefined | null }>) {
  if (!summary) return <span className="h-4 w-40 animate-pulse rounded bg-muted" />;
  return (
    <>
      <span className="line-clamp-2 text-sm text-muted-foreground">{summary.value}</span>
      {summary.status && <StatusBadge status={summary.status} />}
    </>
  );
}

export function StatusBadge({ status }: Readonly<{ status: TopicStatus }>) {
  switch (status) {
    case TopicStatus.done:
      return (
        <span className="flex items-center gap-1 text-sm font-medium text-ok">
          <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          {StatusCopy.done}
        </span>
      );
    case TopicStatus.todo:
      return (
        <span className="flex items-center gap-1 text-sm font-medium text-attention">
          <CircleAlert className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
          {StatusCopy.todo}
        </span>
      );
    case TopicStatus.optional:
      return (
        <span className="text-sm font-medium text-muted-foreground">{StatusCopy.optional}</span>
      );
    default: {
      const never: never = status;
      return never;
    }
  }
}

/** "Configurar" when missing, "Abrir" on rows without a status, else "Editar". */
function actionLabel(status: TopicStatus | undefined): string {
  if (!status) return StatusCopy.open;
  return status === TopicStatus.todo ? StatusCopy.setUp : StatusCopy.edit;
}

/** "Editar" on every row; the next topic to set up gets the filled "Configurar". */
function Action({ next, status }: Readonly<{ next: boolean; status: TopicStatus | undefined }>) {
  if (next)
    return (
      <span className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground">
        {StatusCopy.setUp}
      </span>
    );
  return (
    <span className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-muted-foreground group-hover:text-foreground">
      {actionLabel(status)}
      <ChevronRight className="size-4" aria-hidden="true" />
    </span>
  );
}
