// Panel copy in pt-BR for Mais > Equipe and the invitation page (spec 10).

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const TeamRole = {
  owner: 'owner',
  professional: 'professional',
  receptionist: 'receptionist',
} as const;
export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];

export const ROLE_LABEL: Readonly<Record<string, string>> = {
  [TeamRole.owner]: 'Dono',
  [TeamRole.professional]: 'Profissional',
  [TeamRole.receptionist]: 'Recepção',
};

export const TeamCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Equipe',
    intro:
      'Quem mais acessa o painel. A recepção vê agenda e conversas, mas não mexe em cobrança nem em conexões.',
    membersHeading: 'Na equipe',
    you: 'você',
    invitesHeading: 'Convites',
    noInvites: 'Nenhum convite pendente.',
    inviteHeading: 'Convidar alguém',
    email: 'E-mail da pessoa',
    emailPlaceholder: 'recepcao@seuconsultorio.com.br',
    role: 'Função',
    send: 'Enviar convite',
    sending: 'Enviando…',
    sent: 'Convite enviado.',
    resend: 'Reenviar',
    resent: 'Convite reenviado.',
    revoke: 'Cancelar convite',
    revokeConfirm: 'Cancelar este convite? O link deixa de funcionar.',
    revoked: 'Convite cancelado.',
    pending: 'Aguardando resposta',
    expired: 'Vencido',
    removeMember: 'Remover',
    removeConfirm: (name: string) =>
      `Remover ${name} da equipe? A pessoa perde o acesso ao painel.`,
    removed: 'Pessoa removida da equipe.',
    removeAction: 'Remover da equipe',
    roleChanged: 'Função atualizada.',
    roleOf: (name: string) => `Função de ${name}`,
    failed: 'Não conseguimos concluir. Tente de novo.',
    ownerOnly: 'Só o dono gerencia a equipe.',
    loadFailed: 'Não conseguimos carregar a equipe. Confira a conexão e tente de novo.',
  },
  [Locale.enUS]: {},
});

export const TeamInviteCopy = defineMessages({
  [Locale.ptBR]: {
    loading: 'Conferindo o convite…',
    invalid: 'Este link de convite não existe. Confira se copiou o endereço inteiro.',
    closed: {
      accepted: 'Este convite já foi aceito. Se a conta é sua, é só entrar.',
      canceled: 'Este convite foi cancelado. Fale com quem te convidou.',
      rejected: 'Este convite foi recusado. Peça um novo a quem te convidou.',
      expired: 'Este convite venceu. Peça um link novo a quem te convidou.',
    },
    title: (practice: string) => `Entrar na equipe de ${practice}`,
    as: (role: string) => `Você foi convidado como ${role}.`,
    accept: 'Aceitar convite',
    accepting: 'Entrando…',
    haveAccount: 'Já tenho conta',
    signUpSubtitle: (practice: string) =>
      `Convite para a equipe de ${practice}. Crie seu acesso com o e-mail que recebeu o convite.`,
    signedAs: (email: string) => `Você está com a conta ${email}.`,
    otherEmail: (invited: string) =>
      `Este convite é para ${invited}. Saia e entre com esse e-mail, ou peça um novo convite.`,
    signOut: 'Sair e trocar de conta',
    failed: 'Não conseguimos aceitar o convite. Tente de novo.',
  },
  [Locale.enUS]: {},
});
