import { Button } from '@/components/ui/button';

export interface ServiceAlert {
  message: string;
  action: string;
  onAction: () => void;
}

/** Spec 10: a strip above everything when something stops the service, with the fix. */
export function AlertBar({ alert }: Readonly<{ alert: ServiceAlert | null }>) {
  if (!alert) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 bg-danger-soft px-4 py-1 pt-[max(4px,env(safe-area-inset-top))] text-sm"
    >
      <span>{alert.message}</span>
      <Button
        variant="link"
        className="h-11 shrink-0 px-0 font-semibold text-danger"
        onClick={alert.onAction}
      >
        {alert.action}
      </Button>
    </div>
  );
}
