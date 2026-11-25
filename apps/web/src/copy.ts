// Panel copy in pt-BR (RN-56): second person, no software jargon, "assistente" never "bot".

import { Route } from './routes';

export const PRODUCT_NAME = 'Consultório Aberto';

export const LoginCopy = {
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
} as const;

export const NavCopy = {
  conversations: 'Conversas',
  agenda: 'Agenda',
  today: 'Hoje',
  more: 'Mais',
  label: 'Navegação principal',
} as const;

export const EmptyCopy = {
  conversations: {
    title: 'Nenhuma conversa ainda',
    body: 'Quando um paciente mandar mensagem no seu WhatsApp, a conversa aparece aqui. Antes disso, teste o assistente no simulador.',
  },
  today: {
    title: 'Nada para hoje',
    body: 'Aqui aparecem os atendimentos do dia e o que precisa de você: conversas aguardando, rascunhos para aprovar e perguntas que o assistente não soube.',
  },
} as const;

export const MoreCopy = {
  title: 'Mais',
  items: [
    { label: 'Assistente', hint: 'Autonomia, apresentação e tom de voz', to: Route.assistant },
    { label: 'Serviços e local', hint: 'Valores, duração e endereço', to: Route.services },
    { label: 'Conexões', hint: 'WhatsApp e Google Agenda' },
    { label: 'Plano e uso', hint: 'Conversas do mês e fatura', to: Route.usage },
    { label: 'Equipe', hint: 'Quem mais acessa o painel' },
    { label: 'Ajuda', hint: 'Passo a passo e avisos do painel', helpLink: true },
  ],
  signOut: 'Sair',
} as const;

export const AlertCopy = {
  whatsappDisconnected: 'WhatsApp desconectado. Seus pacientes não estão sendo respondidos.',
  reconnect: 'Reconectar',
} as const;

export const LoadingCopy = 'Carregando…';
