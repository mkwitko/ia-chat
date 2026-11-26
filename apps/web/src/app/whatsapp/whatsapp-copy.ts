// Panel copy in pt-BR for "Conectar WhatsApp" (E-24): second person, no jargon.

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';

export const WhatsappCopy = defineMessages({
  [Locale.ptBR]: {
    heading: 'WhatsApp',
    intro:
      'Conecte o número do consultório. Leva uns 5 minutos numa janela da Meta. Você continua usando o app WhatsApp Business no celular, no mesmo número.',
    payment:
      'Responder a quem escreveu não custa nada. Lembretes e confirmações enviados depois de 24 horas sem conversa a Meta cobra à parte, no cartão que você cadastra na conta do WhatsApp. Sem cartão, eles não saem.',
    offTitle: 'Conexão com o WhatsApp ainda não liberada',
    offWhy:
      'A conexão de números pela Meta ainda não foi ligada pela nossa equipe nesta conta. Não depende de nada da sua parte.',
    offWhat:
      'Siga com os outros passos e teste o assistente no simulador. Se precisar conectar antes, responda o e-mail que enviamos para você.',
    offAction: 'Abrir o simulador',
    ownerOnly: 'Só o dono da conta pode conectar o número.',
    loadFailed: 'Não conseguimos ver o estado do WhatsApp. Tente de novo.',
    connect: 'Conectar WhatsApp',
    reconnect: 'Trocar de número',
    opening: 'Abrindo a janela da Meta…',
    finishing: 'Configurando seu número na Meta…',
    cancelled: 'A conexão não foi concluída. Quando quiser, é só tentar de novo.',
    sdkFailed:
      'Não conseguimos abrir a janela da Meta. Confira se o navegador bloqueou a janela e tente de novo.',
    failed: 'A Meta recusou a conexão. Tente de novo e aceite todas as permissões pedidas.',
    taken:
      'Esse número já está conectado a outra conta. Fale com a gente pelo botão "preciso de ajuda".',
    connected: (phone: string) => `Conectado: ${phone}`,
    connectedNoPhone: 'WhatsApp conectado.',
    coexistence: 'O app WhatsApp Business continua funcionando no seu celular.',
    pending: 'A conexão começou, mas falta concluir a configuração na Meta.',
    retry: 'Tentar concluir',
    retrying: 'Tentando…',
    paymentLink: 'Cadastrar cartão na Meta',
  },
  [Locale.enUS]: {},
});
