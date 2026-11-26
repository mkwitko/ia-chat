// Panel copy in pt-BR for the Pix deposit (H-52): the pending list and the settings.

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const DepositsCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Sinais para confirmar',
    intro:
      'Confira na sua conta se o Pix chegou e confirme. Só então o cliente recebe a confirmação do horário.',
    empty: 'Nenhum sinal esperando confirmação.',
    loadFailed: 'Não conseguimos carregar os sinais. Confira a conexão e tente de novo.',
    confirm: 'Recebi o Pix',
    confirming: 'Confirmando…',
    backHome: 'Início',
    confirmed: 'Recebimento confirmado. O cliente vai receber a confirmação.',
    expired: 'O prazo deste sinal acabou e o horário já foi liberado.',
    line: (service: string, when: string) => `${service} · ${when}`,
    until: (time: string) => `Horário reservado até ${time}`,
    unnamed: 'Cliente sem nome',
    settingsTitle: 'Sinal por Pix',
    settingsIntro:
      'O cliente paga direto na sua conta, pela sua chave Pix. Você confirma o recebimento com um toque.',
    settingsLink: 'Chave Pix e valor do sinal',
    pixKey: 'Sua chave Pix',
    pixKeyHint: 'CPF, CNPJ, celular com +55, e-mail ou chave aleatória.',
    receiverName: 'Nome de quem recebe',
    city: 'Cidade',
    holdMinutes: 'Quanto tempo o horário fica reservado esperando o Pix',
    minutes: (value: number) => `${String(value)} minutos`,
    refundPolicy: 'Regra de devolução do sinal (opcional)',
    services: 'Valor do sinal por serviço',
    servicesHint: 'Deixe em branco para não pedir sinal naquele serviço.',
    invalidKey: 'Essa não parece uma chave Pix. Confira e tente de novo.',
    invalidAmount: 'Valor inválido. Use, por exemplo, 50 ou 50,00.',
    save: 'Salvar',
    featureOff:
      'O sinal por Pix está desligado em Recursos. Salve a chave e ligue lá quando quiser.',
  },
  [Locale.enUS]: {},
});
