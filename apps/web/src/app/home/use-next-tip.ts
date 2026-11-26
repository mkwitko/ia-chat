import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { Route } from '@/routes';
import { useOnboarding, type OnboardingView } from '../onboarding/onboarding-api';
import { useReviewContacts } from '../whatsapp/review-api';
import { ReviewCopy } from '../whatsapp/review-copy';
import { HistoryState, useWhatsappStatus } from '../whatsapp/whatsapp-api';

// docs/research/09, "Adiar para depois da ativação": once the assistant is on, Início suggests
// one improvement at a time, the first one still open, instead of a checklist.

export const TipCopy = defineMessages({
  [Locale.ptBR]: {
    tone: 'Ajuste o jeito de falar do assistente',
    reviewLink: 'Cadastre o link de avaliação do Google',
    unanswered: (count: number) =>
      count === 1
        ? 'Responda 1 pergunta que o assistente não soube'
        : `Responda ${String(count)} perguntas que o assistente não soube`,
    packages: 'Cadastre seus pacotes de sessões',
    team: 'Convide a sua secretária',
    open: 'Abrir',
  },
  [Locale.enUS]: {},
});

interface Tip {
  title: string;
  to: string;
  open: boolean;
}

function tipsOf({ checklist }: OnboardingView, staged: number): Tip[] {
  return [
    { title: ReviewCopy.checklist(staged), to: Route.importReview, open: staged > 0 },
    {
      title: TipCopy.unanswered(checklist.unanswered),
      to: Route.knowledge,
      open: checklist.unanswered > 0,
    },
    { title: TipCopy.tone, to: Route.tone, open: !checklist.tone },
    { title: TipCopy.reviewLink, to: Route.clinicBusiness, open: !checklist.reviewLink },
    { title: TipCopy.packages, to: Route.clinicServices, open: checklist.packages === 0 },
    { title: TipCopy.team, to: Route.team, open: !checklist.team },
  ];
}

/** The first open improvement after setup, or null. */
export function useNextTip(): { title: string; to: string } | null {
  const view = useOnboarding().data;
  const history = useWhatsappStatus().data?.channel?.history.state;
  const staged = useReviewContacts(history === HistoryState.done).data?.length ?? 0;
  if (view?.current !== null) return null;
  return tipsOf(view, staged).find((tip) => tip.open) ?? null;
}
