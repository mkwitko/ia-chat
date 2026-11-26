// Panel copy for the 14-day trial (spec 09, RF-80 and RF-88).

import { Locale, dateFormat } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

const DAY = dateFormat({ day: '2-digit', month: '2-digit', year: 'numeric' });
const keptUntilText = (keptUntil: string | null) =>
  keptUntil ? ` até ${DAY.format(new Date(keptUntil))}` : '';

export const TrialCopy = defineMessages({
  [Locale.ptBR]: {
    ended: (keptUntil: string | null) =>
      `Seu teste terminou: o assistente parou de responder. Seus dados ficam guardados${keptUntilText(keptUntil)}.`,
    endingTitle: (days: number) =>
      days <= 1
        ? 'Seu teste grátis termina amanhã'
        : `Seu teste grátis termina em ${String(days)} dias`,
    endingBody: 'Para o assistente continuar respondendo, veja como assinar.',
    action: 'Ver plano',
  },
  [Locale.enUS]: {},
});
