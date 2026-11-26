import { INVITE_TTL_DAYS } from '@app/core';
import type { EmailMessage } from './outbox.ts';

const PRODUCT_NAME = 'Consultório Aberto';

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
    subject: `Você está na lista de espera do ${PRODUCT_NAME}`,
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

export interface OnboardingInviteEmail {
  to: string;
  url: string;
  practiceName: string;
}

/** H-37: the operator's invite to open a consultório. */
export function onboardingInviteEmail({
  to,
  url,
  practiceName,
}: OnboardingInviteEmail): EmailMessage {
  return {
    to,
    subject: `Seu convite para o ${PRODUCT_NAME}`,
    text: `Olá! O acesso de ${practiceName} ao ${PRODUCT_NAME} está pronto.\n\nPara criar sua conta, abra este link:\n${url}\n\nO link vale por ${String(INVITE_TTL_DAYS)} dias e só pode ser usado uma vez.\n\nSe não esperava este convite, ignore esta mensagem.`,
  };
}
