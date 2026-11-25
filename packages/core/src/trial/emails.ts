import type { EmailMessage } from './email-types.ts';
import { DATA_RETENTION_DAYS, Reminder } from './trial.ts';

// Texts for the professional, in Brazilian Portuguese. No health data, no patient names.

export interface ReminderEmail {
  to: string;
  stage: Reminder;
  /** Link that resumes the setup (`/configuracao`). */
  resumeUrl: string;
}

const ASSISTED =
  'Prefere ajuda? Respondendo este e-mail, marcamos uma configuração assistida de 15 minutos, em que deixamos tudo pronto com você.';
const NOT_YOU = 'Se não foi você, ignore esta mensagem.';

const REMINDER_SUBJECT = {
  [Reminder.first]: 'Falta pouco para o seu assistente atender',
  [Reminder.second]: 'Seu teste grátis está parado: vamos terminar juntos?',
} as const satisfies Record<Reminder, string>;

const REMINDER_INTRO = {
  [Reminder.first]: 'Você começou a configurar o seu assistente e parou no meio do caminho.',
  [Reminder.second]: 'Já faz três dias que a configuração do seu assistente está parada.',
} as const satisfies Record<Reminder, string>;

/** RF-84: one reminder per stage, with the assisted-setup offer. */
export function abandonmentEmail({ to, stage, resumeUrl }: ReminderEmail): EmailMessage {
  return {
    to,
    subject: REMINDER_SUBJECT[stage],
    text: `${REMINDER_INTRO[stage]} Continue de onde parou:\n${resumeUrl}\n\n${ASSISTED}\n\n${NOT_YOU}`,
  };
}

export interface TrialEndedEmail {
  to: string;
  panelUrl: string;
  /** Date shown to the owner, already formatted (dd/mm/aaaa). */
  keptUntil: string;
}

/** RF-88: the assistant stopped; the data is kept. The subscription link comes with E-25. */
export function trialEndedEmail({ to, panelUrl, keptUntil }: TrialEndedEmail): EmailMessage {
  return {
    to,
    subject: 'Seu teste grátis terminou',
    text: `Os 14 dias de teste acabaram e o assistente foi desligado: ele não responde mais os seus pacientes.\n\nSeus dados ficam guardados por ${String(DATA_RETENTION_DAYS)} dias, até ${keptUntil}. A assinatura pelo painel chega em breve; para continuar antes disso, responda este e-mail.\n\nPainel: ${panelUrl}`,
  };
}
