import { Keyboard } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { SEARCH_FIELD, SHORTCUT_ATTR, Shortcut, useShortcut } from '@/lib/shortcuts';
import { Route } from '@/routes';
import { NEW_BOOKING_PATH } from '../home/day-sections';

export const ShortcutsCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Atalhos do teclado',
    body: 'No computador, aperte uma tecla para ir direto ao que precisa. Não valem enquanto você escreve.',
    close: 'Fechar',
    list: [
      { key: Shortcut.search, text: 'Procurar um cliente' },
      { key: Shortcut.newBooking, text: 'Novo agendamento' },
      { key: Shortcut.next, text: 'Próxima conversa (em Conversas)' },
      { key: Shortcut.previous, text: 'Conversa anterior (em Conversas)' },
      { key: Shortcut.takeOver, text: 'Assumir a conversa aberta' },
      { key: Shortcut.help, text: 'Mostrar esta lista' },
    ],
  },
  [Locale.enUS]: {},
});

/** Global keys: "/" search, "n" new booking, "?" this list. */
function useGlobalKeys(openList: () => void) {
  const navigate = useNavigate();
  useShortcut(Shortcut.help, openList);
  useShortcut(Shortcut.newBooking, () => void navigate(NEW_BOOKING_PATH));
  useShortcut(Shortcut.search, () => {
    const field = document.querySelector<HTMLInputElement>(`[${SHORTCUT_ATTR}="${SEARCH_FIELD}"]`);
    if (field) field.focus();
    else void navigate(Route.customers, { state: { focusSearch: true } });
  });
}

/** The list of shortcuts, opened from the sidebar or with "?". */
export function ShortcutsSheet() {
  const [open, setOpen] = useState(false);
  useGlobalKeys(() => {
    setOpen(true);
  });
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex min-h-10 items-center gap-3 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Keyboard className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          {ShortcutsCopy.title}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fade-in fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="sheet-in fixed top-1/2 left-1/2 z-50 grid w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border bg-card p-6 shadow-card">
          <Dialog.Title className="text-lg">{ShortcutsCopy.title}</Dialog.Title>
          <Dialog.Description className="text-pretty text-muted-foreground">
            {ShortcutsCopy.body}
          </Dialog.Description>
          <ShortcutList />
          <Dialog.Close asChild>
            <Button variant="outline" className="justify-self-end">
              {ShortcutsCopy.close}
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ShortcutList() {
  return (
    <dl className="grid gap-2">
      {ShortcutsCopy.list.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <dt>
            <kbd className="grid min-w-8 place-items-center rounded-md border border-line-strong bg-muted px-2 py-0.5 font-sans font-semibold">
              {item.key}
            </kbd>
          </dt>
          <dd>{item.text}</dd>
        </div>
      ))}
    </dl>
  );
}
