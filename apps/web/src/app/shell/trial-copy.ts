// Panel copy in pt-BR for the 14-day trial (spec 09, RF-80 and RF-88).

const DISPLAY_LOCALE = 'pt-BR';
const ONE_DAY = 1;

function daysLeftText(daysLeft: number): string {
  if (daysLeft === ONE_DAY) return 'falta 1 dia';
  return `faltam ${String(daysLeft)} dias`;
}

function keptUntilText(keptUntil: string | null): string {
  if (!keptUntil) return '';
  return ` até ${new Date(keptUntil).toLocaleDateString(DISPLAY_LOCALE)}`;
}

export const TrialCopy = {
  active: (daysLeft: number) =>
    `Teste grátis: ${daysLeftText(daysLeft)}. Sem cartão e sem compromisso.`,
  ended: (keptUntil: string | null) =>
    `Seu teste terminou e o assistente está desligado: ele não responde mais os seus pacientes. Seus dados ficam guardados${keptUntilText(keptUntil)}.`,
  next: 'A assinatura pelo painel chega em breve. Para continuar antes disso, responda o e-mail que enviamos para você.',
  action: 'Ver plano',
} as const;
