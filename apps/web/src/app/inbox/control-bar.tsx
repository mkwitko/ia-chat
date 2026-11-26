import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Control, useSetControl } from './inbox-api';
import { ConversationCopy as Copy } from './inbox-copy';
import { ensureOnline } from './online';

/** DESIGN.md: fixed bar, "Assumir" with the assistant, "Devolver ao assistente" with you. */
export function ControlBar({
  conversationId,
  control,
}: Readonly<{ conversationId: string; control: Control }>) {
  const set = useSetControl(conversationId);
  const mine = control === Control.human;
  const change = () => {
    if (!ensureOnline()) return;
    set.mutate(mine ? Control.ai : Control.human, {
      onError: () => notifyError(Copy.controlFailed),
    });
  };
  return (
    <div
      role="group"
      aria-label={Copy.controlLabel}
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b bg-card px-4 py-2 lg:px-6"
    >
      <p className="min-w-48 flex-1 text-sm text-muted-foreground">
        {mine ? Copy.handBackHint : Copy.takeOverHint}
      </p>
      <Button variant={mine ? 'outline' : 'default'} disabled={set.isPending} onClick={change}>
        {mine ? Copy.handBack : Copy.takeOver}
      </Button>
    </div>
  );
}
