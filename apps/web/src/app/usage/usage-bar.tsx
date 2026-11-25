import { cn } from '@/lib/utils';
import type { Usage } from './usage-api';
import { UsageCopy as Copy } from './usage-copy';

const FULL_PERCENT = 100;

function toneOf({ full, warning }: Pick<Usage, 'full' | 'warning'>): string {
  if (full) return 'bg-danger';
  return warning ? 'bg-attention' : 'bg-primary';
}

/** The bar fills up to the franchise; past it the bar stays full and the text says how far. */
export function UsageBar({ usage }: Readonly<{ usage: Usage }>) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-semibold tabular-nums">
          {Copy.usedLine(usage.conversations, usage.franchise)}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {Copy.percentLine(usage.percent)}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={Copy.barLabel}
        aria-valuemin={0}
        aria-valuemax={usage.franchise}
        aria-valuenow={Math.min(usage.conversations, usage.franchise)}
        className="h-3 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn('h-full rounded-full', toneOf(usage))}
          style={{ width: `${String(Math.min(usage.percent, FULL_PERCENT))}%` }}
        />
      </div>
    </div>
  );
}
