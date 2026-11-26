// Panel copy in pt-BR for "Conta" (owner, 26/11/2026): plan, subscription, notices and look.

import { Locale, locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const AccountCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Conta',
    intro: 'Seu plano, o pagamento da assinatura e os avisos que você recebe.',
    usage: 'Plano e uso',
    usageValue: (plan: string, used: number, included: number) =>
      `Plano ${plan} · ${used.toLocaleString(locale)} de ${included.toLocaleString(locale)} conversas este mês`,
    billing: 'Assinatura',
    billingStatus: {
      trial: 'Teste grátis',
      active: 'Em dia',
      restricted: 'Pagamento pendente',
      cancelled: 'Cancelada',
    },
    notifications: 'Avisos e tema',
    notificationsHint: 'Resumo da semana e tela clara ou escura',
    referral: 'Indique e ganhe',
    referralHint: 'Seu link para indicar outros profissionais',
    notificationsIntro: 'O que chega para você e como o painel aparece.',
  },
  [Locale.enUS]: {},
});
