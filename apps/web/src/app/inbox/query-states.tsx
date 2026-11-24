import { Button } from '@/components/ui/button';
import { LoadingCopy } from '@/copy';
import { InboxCopy } from './inbox-copy';

const SKELETON_ROWS = 5;

/** RN-53: loading is a skeleton shaped like the content, with a text for screen readers. */
export function ListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="divide-y border-y bg-card md:rounded-xl md:border"
    >
      <span className="sr-only">{LoadingCopy}</span>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex min-h-[72px] items-center gap-3 px-4 py-2">
          <span className="size-11 shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          <span className="grid flex-1 gap-2">
            <span className="h-3.5 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <span className="h-3 w-4/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** RN-53: an error says what happened and what to do. */
export function LoadError({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <div role="alert" className="grid justify-items-start gap-3 px-4 py-6 md:px-0">
      <p>{message}</p>
      <Button variant="outline" onClick={onRetry}>
        {InboxCopy.retry}
      </Button>
    </div>
  );
}
