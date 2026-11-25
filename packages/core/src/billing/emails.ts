import type { EmailMessage } from '../trial/email-types.ts';
import { Notice, RESTRICT_AFTER_DAYS, type OverdueStage } from './ladder.ts';

// Texts for the professional, in Brazilian Portuguese.

export interface OverdueEmail {
  to: string;
  stage: OverdueStage;
  panelUrl: string;
  invoiceUrl: string | null;
}

const SUBJECT_FIRST = 'A fatura do seu assistente está em aberto';
const SUBJECT_SECOND = 'Lembrete: a fatura do seu assistente continua em aberto';
const FIRST_NOTICE = 'A fatura da sua assinatura venceu e ainda não identificamos o pagamento.';
const SECOND_NOTICE = 'A fatura da sua assinatura venceu há alguns dias e continua em aberto.';
const WARNING = `Se o pagamento não for feito em ${String(RESTRICT_AFTER_DAYS)} dias do vencimento, o assistente passa a avisar os pacientes de que você responderá, sem atender sozinho. Seus dados ficam guardados.`;
const IGNORE = 'Se já pagou, desconsidere esta mensagem: a confirmação pode levar um dia.';

/** The two notices of the overdue ladder. */
export function overdueEmail({ to, stage, panelUrl, invoiceUrl }: OverdueEmail): EmailMessage {
  const first = stage.notice === Notice.first;
  const pay = invoiceUrl ? `Pagar a fatura: ${invoiceUrl}\n` : '';
  return {
    to,
    subject: first ? SUBJECT_FIRST : SUBJECT_SECOND,
    text: `${first ? FIRST_NOTICE : SECOND_NOTICE}\n${pay}Assinatura no painel: ${panelUrl}\n\n${WARNING}\n\n${IGNORE}`,
  };
}
