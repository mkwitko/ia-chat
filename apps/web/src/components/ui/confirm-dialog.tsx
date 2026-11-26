import { AlertDialog } from 'radix-ui';
import { useSyncExternalStore } from 'react';
import { defineMessages } from '@/i18n/messages';
import { Locale } from '@/i18n/locale';
import { Button } from './button';

// The panel's own confirmation (RN-54), in place of window.confirm: same promise shape, so a
// call site reads `if (await confirmAction({...}))`, but it looks like the rest of the panel,
// keeps focus inside, closes on Esc and names both choices in words.

const Copy = defineMessages({
  [Locale.ptBR]: { cancel: 'Voltar', remove: 'Remover' },
  [Locale.enUS]: {},
});

export interface ConfirmOptions {
  title: string;
  body?: string;
  /** The verb on the button: "Cancelar atendimento", "Desconectar". */
  confirm: string;
  /** Red button for what cannot be undone. */
  destructive?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

const QUESTION_END = '? ';

/** "Remover X? Explicação." as a short title and the explanation under it. */
export function questionOf(text: string): Pick<ConfirmOptions, 'title' | 'body'> {
  const end = text.indexOf(QUESTION_END);
  if (end < 0) return { title: text };
  return { title: text.slice(0, end + 1), body: text.slice(end + QUESTION_END.length) };
}

/** Ask before acting; resolves true only when the person chose the action. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  pending?.resolve(false);
  return new Promise((resolve) => {
    pending = { ...options, resolve };
    emit();
  });
}

function settle(ok: boolean) {
  pending?.resolve(ok);
  pending = null;
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Ask, then run `action` only if the person confirmed. */
export function confirmThen(options: ConfirmOptions, action: () => void) {
  void confirmAction(options).then((ok) => {
    if (ok) action();
  });
}

/** "Remover X? Explicação." in red, then `action`. */
export function confirmRemove<A extends unknown[]>(
  question: string,
  action: (...args: A) => void,
  ...args: A
) {
  confirmThen({ ...questionOf(question), confirm: Copy.remove, destructive: true }, () => {
    action(...args);
  });
}

/** Mounted once at the root, next to the toaster. */
export function ConfirmHost() {
  const current = useSyncExternalStore(subscribe, () => pending);
  return (
    <AlertDialog.Root
      open={current !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40 fade-in" />
        <AlertDialog.Content className="fixed inset-x-0 bottom-0 z-50 grid sheet-in gap-4 rounded-t-2xl border bg-card p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-card sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[28rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6">
          <AlertDialog.Title className="text-lg text-balance">{current?.title}</AlertDialog.Title>
          {current?.body ? (
            <AlertDialog.Description className="text-pretty text-muted-foreground">
              {current.body}
            </AlertDialog.Description>
          ) : (
            <AlertDialog.Description className="sr-only">{current?.title}</AlertDialog.Description>
          )}
          <div className="grid gap-2 pt-2 sm:flex sm:flex-row-reverse">
            <AlertDialog.Action asChild>
              <Button
                className={current?.destructive ? 'bg-danger text-card hover:bg-danger/90' : ''}
                onClick={() => {
                  settle(true);
                }}
              >
                {current?.confirm}
              </Button>
            </AlertDialog.Action>
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">{Copy.cancel}</Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
