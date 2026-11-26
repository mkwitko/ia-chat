import { CircleAlert, RotateCw } from 'lucide-react';
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

/** RN-53 and Nielsen 9: what happened, what to do, and the button that does it. */
export function LoadError({
  message,
  hint = InboxCopy.retryHint,
  onRetry,
}: Readonly<{ message: string; hint?: string; onRetry: () => void }>) {
  return (
    <div
      role="alert"
      className="mx-4 mb-6 grid justify-items-start gap-3 rounded-xl border border-danger/40 bg-danger-soft p-5 md:mx-0"
    >
      <p className="flex items-start gap-2.5 font-semibold">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
        {message}
      </p>
      <p className="text-muted-foreground">{hint}</p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCw className="size-4" aria-hidden="true" />
        {InboxCopy.retry}
      </Button>
    </div>
  );
}
