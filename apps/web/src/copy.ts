// Panel copy in pt-BR (RN-56): second person, no software jargon, "assistente" never "bot".

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { Route } from './routes';

export const PRODUCT_NAME = 'Consultório Aberto';

export const LoginCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Entrar',
    subtitle: 'Acompanhe as conversas e a agenda do seu consultório.',
    email: 'E-mail',
    password: 'Senha',
    submit: 'Entrar',
    submitting: 'Entrando…',
    google: 'Entrar com o Google',
    divider: 'ou',
    invalid: 'E-mail ou senha incorretos. Confira e tente de novo.',
    unverified: 'Confirme seu e-mail antes de entrar. Enviamos o link para a sua caixa de entrada.',
    offline: 'Sem conexão com a internet. Confira o sinal e tente de novo.',
    generic: 'Não conseguimos entrar agora. Tente de novo em alguns minutos.',
  },
  [Locale.enUS]: {},
});

export const NavCopy = defineMessages({
  [Locale.ptBR]: {
    home: 'Início',
    customers: 'Clientes',
    conversations: 'Conversas',
    agenda: 'Agenda',
    more: 'Mais',
    settings: 'Configurações',
    label: 'Navegação principal',
  },
  [Locale.enUS]: {},
});

export const EmptyCopy = defineMessages({
  [Locale.ptBR]: {
    conversations: {
      title: 'Nenhuma conversa ainda',
      body: 'Quando um paciente mandar mensagem no seu WhatsApp, a conversa aparece aqui. Antes disso, teste o assistente no simulador.',
    },
  },
  [Locale.enUS]: {},
});

export const MoreCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Mais',
    /** The settings, at most five entries (owner, 26/11/2026). */
    items: [
      {
        label: 'Meu consultório',
        hint: 'Serviços, horários, endereço e WhatsApp',
        to: Route.clinic,
      },
      { label: 'Assistente', hint: 'Como ele responde e o que ele sabe', to: Route.assistant },
      { label: 'Equipe', hint: 'Quem mais usa o painel', to: Route.team },
      { label: 'Conta', hint: 'Plano, assinatura e avisos', to: Route.account },
      { label: 'Ajuda', hint: 'Dúvidas e conversa com a gente', to: Route.support },
    ],
    signOut: 'Sair',
  },
  [Locale.enUS]: {},
});

export const AlertCopy = defineMessages({
  [Locale.ptBR]: {
    whatsappDisconnected: 'WhatsApp desconectado. Seus pacientes não estão sendo respondidos.',
    reconnect: 'Reconectar',
  },
  [Locale.enUS]: {},
});

export const LoadingCopy: string = defineMessages({
  [Locale.ptBR]: { text: 'Carregando…' },
  [Locale.enUS]: {},
}).text;
