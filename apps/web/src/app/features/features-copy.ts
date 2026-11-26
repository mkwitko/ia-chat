// Panel copy in pt-BR for Conta › Recursos (H-51): each feature in plain words, for the owner.

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { FeatureKey } from './features-api';

export const FeaturesCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Recursos',
    hint: 'O que o assistente faz por você',
    intro: 'Ligue ou desligue o que o assistente faz. Desligar não apaga nada.',
    loadFailed: 'Não conseguimos carregar os recursos. Confira a conexão e tente de novo.',
    inPlan: (plan: string) => `Disponível no plano ${plan}`,
    items: {
      [FeatureKey.audioTranscription]: {
        label: 'Entender áudios',
        hint: 'O assistente ouve o áudio do cliente e responde por escrito.',
      },
      [FeatureKey.pixDeposit]: {
        label: 'Sinal por Pix',
        hint: 'Ao marcar, o assistente envia o Pix do sinal e segura o horário até você confirmar o recebimento.',
      },
      [FeatureKey.ocrPixReceipt]: {
        label: 'Ler comprovante de Pix',
        hint: 'Quando o cliente manda o comprovante, você vê o valor e confirma com um toque. O assistente nunca confirma sozinho.',
      },
      [FeatureKey.ocrIdCard]: {
        label: 'Ler documento e carteirinha',
        hint: 'Sugere nome, CPF e data de nascimento na ficha do cliente. Você aceita campo por campo.',
      },
      [FeatureKey.ocrMedicalRequest]: {
        label: 'Resumir pedido médico e exame',
        hint: 'Um resumo curto só para você, na ficha do cliente. O assistente não comenta o conteúdo.',
      },
    },
  },
  [Locale.enUS]: {},
});
