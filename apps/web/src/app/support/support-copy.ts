import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const SupportCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Ajuda e suporte',
    hint: 'Artigos e conversa com a gente',
    intro: 'Procure primeiro na central de ajuda. Se não achar, fale com a gente.',
    searchLabel: 'Buscar na central de ajuda',
    searchPlaceholder: 'Ex.: conectar o WhatsApp',
    noResults: 'Nenhum artigo encontrado. Fale com a gente logo abaixo.',
    indexFailed: 'Não foi possível carregar a central de ajuda agora.',
    openCenter: 'Abrir a central de ajuda',
    contactTitle: 'Falar com o suporte',
    contactNote:
      'A mensagem já vai com o código da sua conta, o plano, a situação e a tela em que você estava. Nunca vai nome nem conversa de paciente.',
    whatsapp: 'Falar pelo WhatsApp',
    email: 'Falar por e-mail',
    noChannel: 'O suporte ainda não está disponível por aqui.',
    loadFailed: 'Não foi possível carregar o suporte agora.',
    emailSubject: 'Preciso de ajuda no Consultório Aberto',
    messageIntro: 'Olá! Preciso de ajuda no Consultório Aberto.',
    messageHint: 'Descreva aqui o que aconteceu:',
    field: { account: 'Conta', plan: 'Plano', status: 'Situação', page: 'Tela' },
  },
  [Locale.enUS]: {},
});
