import { cn } from '@/lib/utils';
import { StageLabel } from './customers-labels';
import { Stage } from './customers-types';

// State never depends on color alone: the badge always carries its text.
const BRAND = 'bg-brand-soft text-primary';
const QUIET = 'bg-muted text-muted-foreground';
const TONE: Record<Stage, string> = {
  [Stage.newContact]: 'bg-attention-soft text-attention',
  [Stage.booked]: BRAND,
  [Stage.attended]: BRAND,
  [Stage.notBooked]: QUIET,
  [Stage.lost]: QUIET,
};

export function StageBadge({ stage }: Readonly<{ stage: Stage }>) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        TONE[stage],
      )}
    >
      {StageLabel[stage]}
    </span>
  );
}
