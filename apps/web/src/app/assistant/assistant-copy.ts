import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { Autonomy, IdentityMode } from './settings-api';

// Spec 10, "Assistente": each level says what happens in practice. Spec 01: identity modes.

export const DEFAULT_ASSISTANT_NAME = 'Assistente virtual';

export const AssistantCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Assistente',
    autonomyLegend: 'Quanto o assistente faz sozinho',
    autonomy: [
      {
        value: Autonomy.approve,
        label: 'Aprovar antes de enviar',
        body: 'O assistente escreve a resposta e espera você enviar, editar ou descartar. Mensagem de urgência sai na hora.',
      },
      {
        value: Autonomy.auto,
        label: 'Automático',
        body: 'O assistente responde sozinho e passa a conversa para você quando precisa.',
      },
      {
        value: Autonomy.off,
        label: 'Desligado',
        body: 'O assistente não responde. O paciente recebe a mensagem de ausência e a conversa fica com você.',
      },
    ],
    identityLegend: 'Como ele se apresenta ao paciente',
    identity: [
      {
        value: IdentityMode.assistant,
        label: 'Como assistente virtual',
        body: 'Na primeira mensagem, diz que é o assistente virtual do seu consultório.',
      },
      {
        value: IdentityMode.clinic,
        label: 'Como a recepção',
        body: 'Fala como a recepção do consultório, no seu tom, sem se anunciar como assistente.',
      },
      {
        value: IdentityMode.professional,
        label: 'Como você',
        body: 'Responde em primeira pessoa, sem se apresentar.',
      },
    ],
    previewLabel: 'Primeira mensagem ao paciente:',
    noIntro: 'Sem apresentação: responde direto, como você.',
    professionalRisk:
      'Atenção: o paciente pode contar um sintoma ou uma urgência achando que você leu. Se descobrir que era um assistente, pode perder a confiança em você.',
    truthNote:
      'Em qualquer opção, se o paciente perguntar se está falando com um robô, o assistente diz a verdade.',
    nameLabel: 'Nome do assistente',
    nameHint: 'Aparece na apresentação. Deixe em branco para usar "assistente virtual".',
    save: 'Salvar alterações',
    saving: 'Salvando…',
    saved: 'Alterações salvas.',
    saveFailed: 'Não conseguimos salvar. Tente de novo.',
    forbidden: 'Só o dono e o profissional podem mudar estas opções.',
    loadFailed: 'Não conseguimos carregar as opções do assistente.',
    retry: 'Tentar de novo',
  },
  [Locale.enUS]: {},
});

/** Same text the worker sends (apps/worker/src/agent/copy.ts, identification). */
export function introPreview(mode: IdentityMode, name: string, professional: string): string {
  if (mode === IdentityMode.professional) return AssistantCopy.noIntro;
  if (mode === IdentityMode.clinic) return `Oi! Aqui é do consultório de ${professional}.`;
  return name === DEFAULT_ASSISTANT_NAME
    ? `Oi! Sou a assistente virtual do consultório de ${professional}.`
    : `Oi! Aqui é ${name}, assistente virtual do consultório de ${professional}.`;
}
