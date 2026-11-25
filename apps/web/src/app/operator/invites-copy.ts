import { InviteState } from './invites-api';

// Panel copy in pt-BR for the operator's onboarding invites (H-37).

const DATE = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const date = (iso: string) => DATE.format(new Date(iso));

const STATE_LABELS: Record<InviteState, string> = {
  [InviteState.pending]: 'Aguardando',
  [InviteState.used]: 'Usado',
  [InviteState.expired]: 'Vencido',
  [InviteState.cancelled]: 'Cancelado',
};

export const InvitesCopy = {
  heading: 'Convites',
  hint: 'O cadastro é só por convite. Cada link vale uma vez, por 7 dias, e abre o consultório com o nome abaixo.',
  newHeading: 'Novo convite',
  practiceName: 'Nome do consultório',
  email: 'E-mail do profissional (opcional)',
  emailHint:
    'Só aparece preenchido no cadastro. O link não é enviado por e-mail: copie e mande você.',
  create: 'Criar convite',
  linkLabel: 'Link do convite (aparece só agora)',
  copy: 'Copiar link',
  copied: 'Link copiado.',
  copyFailed: 'Não foi possível copiar. Selecione o link e copie à mão.',
  failed: 'Não foi possível salvar. Confira os dados e tente de novo.',
  resend: 'Gerar novo link',
  cancel: 'Cancelar',
  resent: 'Novo link gerado. O anterior deixou de valer.',
  cancelled: 'Convite cancelado.',
  none: 'Nenhum convite ainda.',
  state: (state: InviteState) => STATE_LABELS[state],
  details: (createdAt: string, expiresAt: string, email: string | null) =>
    [`criado em ${date(createdAt)}`, `vence em ${date(expiresAt)}`, email]
      .filter(Boolean)
      .join(' · '),
} as const;
