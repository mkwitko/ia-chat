import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

/** RN-53: an empty screen says what will show up here and what to do first. */
export function EmptyState({ icon: Icon, title, body }: Readonly<EmptyStateProps>) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-10 md:max-w-md md:px-0">
      <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
