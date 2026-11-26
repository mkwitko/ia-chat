import { CircleHelp, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { HELP_URL } from '@/lib/config';

// Help where the question comes up (Nielsen 10): a "?" next to each screen's title that opens
// the help article for that screen, and a one-time hint on the first visit.

export const HelpArticle = {
  home: 'tela-inicio',
  conversations: 'tela-conversas',
  agenda: 'tela-agenda',
  customers: 'tela-clientes',
  results: 'tela-resultados',
  clinic: 'tela-meu-consultorio',
  assistant: 'tela-assistente',
  account: 'tela-conta',
  setup: 'passo-conta-especialidade',
} as const;
export type HelpArticle = (typeof HelpArticle)[keyof typeof HelpArticle];

const Copy = defineMessages({
  [Locale.ptBR]: {
    help: 'Ajuda sobre esta tela',
    hintLabel: 'Dica',
    dismiss: 'Entendi',
  },
  [Locale.enUS]: {},
});

const ARTICLE_PATH = '/ajuda/';
const HINT_KEY = 'ca-hint-seen:';

/** "?" that opens this screen's help article in a new tab. Hidden when help is not configured. */
export function HelpLink({ article }: Readonly<{ article: HelpArticle }>) {
  if (!HELP_URL) return null;
  return (
    <a
      href={new URL(`${ARTICLE_PATH}${article}`, HELP_URL).toString()}
      target="_blank"
      rel="noreferrer"
      aria-label={Copy.help}
      title={Copy.help}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <CircleHelp className="size-5" strokeWidth={1.75} aria-hidden="true" />
    </a>
  );
}

function seen(id: string): boolean {
  try {
    return localStorage.getItem(`${HINT_KEY}${id}`) !== null;
  } catch {
    return true;
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(`${HINT_KEY}${id}`, '1');
  } catch {
    // Private mode: the hint simply shows again next time.
  }
}

/** A short tip shown until the person taps "Entendi", once per browser. */
export function FirstVisitHint({ id, text }: Readonly<{ id: string; text: string }>) {
  const [open, setOpen] = useState(() => !seen(id));
  if (!open) return null;
  const close = () => {
    markSeen(id);
    setOpen(false);
  };
  return (
    <aside
      aria-label={Copy.hintLabel}
      className="mx-4 -mt-2 mb-6 flex max-w-3xl items-start gap-3 md:mx-0"
    >
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="flex-1 text-pretty text-muted-foreground">{text}</p>
      <button
        type="button"
        onClick={close}
        className="-my-2 -mr-2 inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        {Copy.dismiss}
      </button>
    </aside>
  );
}
