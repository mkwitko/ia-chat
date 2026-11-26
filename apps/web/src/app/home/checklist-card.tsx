import { Check, ChevronRight, Circle } from 'lucide-react';
import { Link } from 'react-router';
import { Route } from '@/routes';
import { useOnboarding, type OnboardingView } from '../onboarding/onboarding-api';
import { useReviewContacts } from '../whatsapp/review-api';
import { ReviewCopy } from '../whatsapp/review-copy';
import { HistoryState, useWhatsappStatus } from '../whatsapp/whatsapp-api';

// docs/research/09, "Adiar para depois da ativação": what is worth refining once the assistant
// is on, on Início, until each item is done. Facts come from GET /api/onboarding.

export const ChecklistCopy = {
  heading: 'Para deixar o assistente ainda melhor',
  tone: 'Ajustar o tom de voz',
  reminders: 'Lembretes 1 dia e 2 horas antes, já ligados',
  reviewLink: 'Cadastrar o link de avaliação do Google',
  faq: (unanswered: number) =>
    unanswered > 0
      ? `Responder ${String(unanswered)} pergunta(s) que o assistente não soube`
      : 'Cadastrar pacotes e perguntas frequentes',
  team: 'Convidar a secretária',
} as const;

interface Item {
  label: string;
  done: boolean;
  to?: string;
}

function itemsOf({ checklist }: OnboardingView, staged: number): Item[] {
  return [
    { label: ChecklistCopy.tone, done: checklist.tone, to: Route.tone },
    { label: ChecklistCopy.reminders, done: true },
    { label: ChecklistCopy.reviewLink, done: checklist.reviewLink, to: Route.profile },
    {
      label: ChecklistCopy.faq(checklist.unanswered),
      done: checklist.unanswered === 0 && checklist.packages > 0,
      to: checklist.unanswered > 0 ? Route.knowledge : Route.profile,
    },
    { label: ChecklistCopy.team, done: checklist.team, to: Route.team },
    ...(staged > 0
      ? [{ label: ReviewCopy.checklist(staged), done: false, to: Route.importReview }]
      : []),
  ];
}

/** Shown after the guided setup, while something on the list is still open. */
export function ChecklistCard() {
  const view = useOnboarding().data;
  const history = useWhatsappStatus().data?.channel?.history.state;
  const staged = useReviewContacts(history === HistoryState.done).data?.length ?? 0;
  if (view?.current !== null) return null;
  const items = itemsOf(view, staged);
  if (items.every((item) => item.done)) return null;
  return (
    <section
      aria-labelledby="checklist-heading"
      className="mx-4 mb-8 grid max-w-3xl gap-3 rounded-xl border bg-card p-5 shadow-card md:mx-0"
    >
      <h2 id="checklist-heading" className="text-lg">
        {ChecklistCopy.heading}
      </h2>
      <ul className="grid">
        {items.map((item) => (
          <li key={item.label}>
            <ChecklistRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChecklistRow({ item }: Readonly<{ item: Item }>) {
  const icon = item.done ? (
    <Check className="size-4 text-ok" aria-hidden="true" />
  ) : (
    <Circle className="size-4 text-muted-foreground" aria-hidden="true" />
  );
  if (item.done || !item.to)
    return (
      <p className="flex min-h-11 items-center gap-3 text-muted-foreground">
        {icon}
        <span>{item.label}</span>
      </p>
    );
  return (
    <Link
      to={item.to}
      className="-mx-2 flex min-h-11 items-center gap-3 rounded-md px-2 font-medium transition-colors hover:bg-muted"
    >
      {icon}
      <span className="flex-1">{item.label}</span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
