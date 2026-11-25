import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  body: string;
  /** The next step (RN-53): a link or button. */
  action?: ReactNode;
  /** A faint picture of what will show up here, drawn by each screen in its own shape. */
  preview?: ReactNode;
}

/** RN-53: an empty screen says what will show up here and what to do first. */
export function EmptyState({ title, body, action, preview }: Readonly<EmptyStateProps>) {
  return (
    <div className="grid gap-6 px-4 py-6 md:px-0 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
      <div className="grid justify-items-start gap-2">
        <h2 className="text-lg">{title}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{body}</p>
        {action && <div className="pt-2">{action}</div>}
      </div>
      {preview && <div aria-hidden="true">{preview}</div>}
    </div>
  );
}

/** Ghost rows shaped like the list that will fill this space (conversations, clients). */
export function GhostRows({ rows, withAvatar }: Readonly<{ rows: number; withAvatar: boolean }>) {
  return (
    <ul className="divide-y divide-dashed rounded-xl border border-dashed">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-4 py-3 opacity-70">
          {withAvatar && <span className="size-10 shrink-0 rounded-full bg-muted" />}
          <span className="grid flex-1 gap-2">
            <span className="h-2.5 w-1/3 rounded-full bg-muted" />
            <span className="h-2 w-2/3 rounded-full bg-muted" />
          </span>
        </li>
      ))}
    </ul>
  );
}
