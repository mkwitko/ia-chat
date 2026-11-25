import { Outlet, useParams } from 'react-router';
import { cn } from '@/lib/utils';
import { ConversationsScreen } from './conversations-screen';
import { InboxCopy } from './inbox-copy';

/**
 * Conversas: on the phone the list and the thread are separate screens; from lg they sit side by
 * side, like WhatsApp Web, so the secretary answers without losing her place in the list.
 */
const ONLY_WIDE = 'hidden lg:block';

export function InboxLayout() {
  const { id } = useParams();
  return (
    <div className="h-full lg:grid lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
      <div className={cn('lg:h-full lg:overflow-y-auto lg:border-r lg:bg-card', id && ONLY_WIDE)}>
        <ConversationsScreen />
      </div>
      <div className={cn('h-full min-h-0', !id && ONLY_WIDE)}>
        <Outlet />
      </div>
    </div>
  );
}

/** Right pane with no conversation open (lg only). */
export function NoConversation() {
  return (
    <div className="grid h-full place-items-center px-8">
      <p className="max-w-xs text-center text-sm text-balance text-muted-foreground">
        {InboxCopy.pickOne}
      </p>
    </div>
  );
}
