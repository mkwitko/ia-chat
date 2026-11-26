import { ChevronRight, ExternalLink } from 'lucide-react';
import { NavLink } from 'react-router';
import { HELP_URL } from '@/lib/config';
import { cn } from '@/lib/utils';

export const MoreRowCopy = { soon: 'Em breve', waiting: 'Aguardando você:' } as const;

const ROW =
  'flex min-h-16 items-center gap-3 px-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring';
const ICON = 'size-4 shrink-0 text-muted-foreground';

export interface MoreRow {
  label: string;
  hint: string;
  to?: string | undefined;
  /** The help center item: opens the site's help center when HELP_URL is configured. */
  helpLink?: boolean;
  /** Count of things waiting on the owner, shown as a pill. */
  badge?: number | undefined;
}

function RowText({ row }: Readonly<{ row: MoreRow }>) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-base font-medium">{row.label}</span>
      <span className="block truncate text-sm text-muted-foreground">{row.hint}</span>
    </span>
  );
}

/** One row of "Mais": every row ends the same way (chevron, external mark or "Em breve"). */
export function MoreItemLink({ row }: Readonly<{ row: MoreRow }>) {
  if (row.helpLink && HELP_URL) {
    return (
      <a href={HELP_URL} target="_blank" rel="noreferrer" className={ROW}>
        <RowText row={row} />
        <ExternalLink className={ICON} aria-hidden="true" />
      </a>
    );
  }
  if (!row.to) {
    return (
      <div className={cn(ROW, 'hover:bg-transparent')}>
        <RowText row={row} />
        <span className="rounded-full border px-2 text-xs text-muted-foreground">
          {MoreRowCopy.soon}
        </span>
      </div>
    );
  }
  return (
    <NavLink to={row.to} className={ROW}>
      <RowText row={row} />
      {row.badge ? (
        <span className="rounded-full bg-attention-soft px-2 text-xs font-semibold text-foreground">
          <span className="sr-only">{MoreRowCopy.waiting} </span>
          {row.badge}
        </span>
      ) : null}
      <ChevronRight className={ICON} aria-hidden="true" />
    </NavLink>
  );
}
