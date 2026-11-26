import { Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { useOnboarding } from '../onboarding/onboarding-api';
import type { HomeView } from './home-api';

// The one celebrated moment of the panel: the first time a patient the assistant booked on its
// own actually came. Shown once per browser, in jade because it is the assistant's doing.

const Copy = defineMessages({
  [Locale.ptBR]: {
    title: 'O assistente marcou um atendimento sozinho, e a pessoa veio.',
    body: 'É o primeiro de muitos. Você acompanha todos em Resultados.',
    ok: 'Que bom!',
  },
  [Locale.enUS]: {},
});

const SEEN_KEY = 'ca-moment-first-booking';

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return true;
  }
}

export function FirstBookingMoment({ home }: Readonly<{ home: HomeView }>) {
  const [open, setOpen] = useState(() => !seen());
  const assistantOn = useOnboarding().data?.current === null;
  if (!open || !assistantOn || home.recovered.count === 0) return null;
  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Private mode: it shows again next time, which is harmless.
    }
    setOpen(false);
  };
  return (
    <section
      aria-label={Copy.title}
      className="mx-4 mb-8 grid gap-4 rounded-xl border border-jade/30 bg-jade-soft p-5 sm:flex sm:items-start md:mx-0"
    >
      <span className="moment-in grid size-10 shrink-0 place-items-center rounded-full bg-jade text-card">
        <Check className="size-5" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <div className="grid flex-1 gap-1">
        <p className="font-semibold text-pretty">{Copy.title}</p>
        <p className="text-pretty text-muted-foreground">{Copy.body}</p>
      </div>
      <Button variant="outline" className="justify-self-start" onClick={close}>
        {Copy.ok}
      </Button>
    </section>
  );
}
