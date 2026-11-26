import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

// "Desfazer" instead of "Tem certeza?" for what can be taken back (Nielsen 3): the item leaves
// the list at once, the server only hears about it when the toast closes, and the toast's
// button puts it back. Pending work is flushed if the page is closed first.

export const UndoCopy = defineMessages({
  [Locale.ptBR]: { undo: 'Desfazer', undone: 'Pronto, desfeito.' },
  [Locale.enUS]: {},
});

export const UNDO_WINDOW_MS = 6000;
const PAGE_HIDE = 'pagehide';

const pending = new Map<string, () => void>();
globalThis.addEventListener(PAGE_HIDE, () => {
  for (const commit of pending.values()) commit();
  pending.clear();
});

interface UndoOptions {
  /** One sentence in the past tense: "Atendimento cancelado." */
  message: string;
  /** The real change, sent once the undo window closes; call `restore` if it fails. */
  commit: (restore: () => void) => void;
  /** Put things back on screen. */
  restore?: () => void;
}

/** Shows the change as done, with a "Desfazer" button for a few seconds. */
export function runWithUndo({ message, commit, restore = () => undefined }: UndoOptions) {
  const key = crypto.randomUUID();
  const run = () => {
    if (!pending.delete(key)) return;
    commit(restore);
  };
  pending.set(key, run);
  toast(message, {
    duration: UNDO_WINDOW_MS,
    action: {
      label: UndoCopy.undo,
      onClick: () => {
        pending.delete(key);
        restore();
        toast(UndoCopy.undone);
      },
    },
    onAutoClose: run,
    onDismiss: run,
  });
}

/** Mutation options that put the row back and report the error when the change fails. */
export function restoreOnError(restore: () => void, report: (error: Error) => void) {
  return {
    onError: (error: Error) => {
      restore();
      report(error);
    },
  };
}

/** One row that leaves the screen at once and comes back on "Desfazer" or if the change fails. */
export function useLeaving() {
  const [gone, setGone] = useState(false);
  const leave = useCallback((options: Omit<UndoOptions, 'restore'>) => {
    setGone(true);
    runWithUndo({
      ...options,
      restore: () => {
        setGone(false);
      },
    });
  }, []);
  return { gone, leave };
}

/** Ids taken off the list while their undo window is open. */
export function useUndoableRemoval() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const remove = useCallback((id: string, options: Omit<UndoOptions, 'restore'>) => {
    setHidden((set) => new Set(set).add(id));
    runWithUndo({
      ...options,
      restore: () => {
        setHidden((set) => {
          const next = new Set(set);
          next.delete(id);
          return next;
        });
      },
    });
  }, []);
  return { hidden, remove };
}
