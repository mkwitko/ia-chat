import { notifyError } from '@/lib/notify';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UndoCopy } from '@/components/ui/undo';
import { Control, useSetControl } from './inbox-api';
import { ConversationCopy as Copy } from './inbox-copy';
import { ensureOnline } from './online';

const other = (to: Control) => (to === Control.human ? Control.ai : Control.human);

/** Switch who answers; the toast says what changed and offers to switch back. */
function useChangeControl(conversationId: string) {
  const set = useSetControl(conversationId);
  const change = (to: Control) => {
    if (!ensureOnline()) return;
    set.mutate(to, {
      onSuccess: () => {
        toast.success(to === Control.human ? Copy.nowYours : Copy.nowAssistant, {
          action: {
            label: UndoCopy.undo,
            onClick: () => {
              change(other(to));
            },
          },
        });
      },
      onError: () => notifyError(Copy.controlFailed),
    });
  };
  return { change, pending: set.isPending };
}

/** DESIGN.md: fixed bar, "Assumir" with the assistant, "Devolver ao assistente" with you. */
export function ControlBar({
  conversationId,
  control,
}: Readonly<{ conversationId: string; control: Control }>) {
  const { change, pending } = useChangeControl(conversationId);
  const mine = control === Control.human;
  return (
    <div
      role="group"
      aria-label={Copy.controlLabel}
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b bg-card px-4 py-2 lg:px-6"
    >
      <p className="min-w-48 flex-1 text-sm text-muted-foreground">
        {mine ? Copy.handBackHint : Copy.takeOverHint}
      </p>
      <Button
        variant={mine ? 'outline' : 'default'}
        disabled={pending}
        onClick={() => {
          change(mine ? Control.ai : Control.human);
        }}
      >
        {mine ? Copy.handBack : Copy.takeOver}
      </Button>
    </div>
  );
}
