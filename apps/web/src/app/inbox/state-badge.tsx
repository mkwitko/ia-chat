import { Bell, Bot, FilePen, UserRound, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InboxState } from './inbox-api';
import { StateCopy } from './inbox-copy';

// DESIGN.md: state never depends on color alone: every badge has text and its own icon shape.
const LOOK: Record<InboxState, { icon: LucideIcon; tone: string }> = {
  [InboxState.needsYou]: { icon: Bell, tone: 'bg-attention-soft text-attention' },
  [InboxState.awaitingApproval]: { icon: FilePen, tone: 'bg-approval-soft text-approval' },
  [InboxState.human]: { icon: UserRound, tone: 'bg-muted text-foreground' },
  [InboxState.assistant]: { icon: Bot, tone: 'bg-jade-soft text-jade-ink' },
};

export function StateBadge({ state }: Readonly<{ state: InboxState }>) {
  const { icon: Icon, tone } = LOOK[state];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        tone,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {StateCopy[state]}
    </span>
  );
}
