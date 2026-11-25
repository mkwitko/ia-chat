import type { EmailMessage } from './outbox.ts';

// Texts for the professional, in Brazilian Portuguese. Product name is still open (E-00f).

export function verificationEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: 'Confirme seu e-mail',
    text: `Para ativar sua conta, abra este link:\n${url}\n\nSe não foi você, ignore esta mensagem.`,
  };
}

export function passwordResetEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: 'Troca de senha',
    text: `Para criar uma senha nova, abra este link:\n${url}\n\nSe não pediu a troca, ignore esta mensagem.`,
  };
}

export function waitlistEmail(to: string): EmailMessage {
  return {
    to,
    subject: 'Você está na lista de espera do Consultório Aberto',
    text: 'Recebemos seu pedido. Avisamos por este e-mail quando abrirmos o acesso, em lotes.\n\nSe não foi você, ignore esta mensagem e não vamos escrever de novo.',
  };
}

export interface InvitationEmail {
  to: string;
  url: string;
  tenantName: string;
  inviterName: string;
}

export function invitationEmail({
  to,
  url,
  tenantName,
  inviterName,
}: InvitationEmail): EmailMessage {
  return {
    to,
    subject: `Convite para ${tenantName}`,
    text: `${inviterName} convidou você para a equipe de ${tenantName}. Para aceitar, abra:\n${url}`,
  };
}
