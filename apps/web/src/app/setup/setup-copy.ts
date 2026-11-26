import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { EmojiUse, Formality } from './setup-api';

// Panel copy in pt-BR for the settings screens (spec 10, "Serviços e local" and "Assistente").

export const CommonCopy = defineMessages({
  [Locale.ptBR]: {
    save: 'Salvar',
    saving: 'Salvando…',
    saved: 'Alterações salvas.',
    saveFailed: 'Não conseguimos salvar. Confira os campos e tente de novo.',
    forbidden: 'Só o dono e o profissional podem mudar estas opções.',
    loadFailed: 'Não conseguimos carregar. Confira a conexão e tente de novo.',
    cancel: 'Cancelar',
    edit: 'Editar',
    remove: 'Remover',
    more: 'Mais',
    assistant: 'Assistente',
  },
  [Locale.enUS]: {},
});

export const ServicesCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Serviços e local',
    servicesHeading: 'Serviços',
    empty:
      'Nenhum serviço cadastrado. Cadastre o que você atende para o assistente informar duração e valor.',
    add: 'Adicionar serviço',
    name: 'Nome do serviço',
    duration: 'Duração (minutos)',
    price: 'Valor (R$)',
    priceInvalid: 'Digite o valor em reais, por exemplo 180 ou 180,50.',
    visible: 'O assistente pode informar este serviço aos pacientes',
    hidden: 'Só para você',
    minutes: (value: number) => `${String(value)} min`,
    pricesForbidden:
      'A sua especialidade não permite divulgar valores. O assistente nunca informa preço ao paciente; os valores ficam só para você.',
    removeConfirm: (name: string) =>
      `Remover "${name}"? Os agendamentos antigos continuam no histórico.`,
    locationHeading: 'Endereço',
    address: 'Endereço completo',
    addressPlaceholder: 'Rua, número, sala, bairro, cidade',
    arrival: 'Instruções de chegada',
    arrivalPlaceholder: 'Estacionamento, interfone, andar, ponto de referência',
    preview: 'Como o paciente recebe:',
  },
  [Locale.enUS]: {},
});

export const ToneCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Jeito de escrever',
    intro:
      'O assistente escreve como você. Responda às perguntas e cole algumas mensagens reais suas.',
    name: 'Seu nome, como os pacientes conhecem',
    namePlaceholder: 'Dr. Rafael',
    formalityLegend: 'Como você escreve para os pacientes?',
    formality: [
      {
        value: Formality.informal,
        label: 'Leve e próximo',
        body: 'Como numa conversa de WhatsApp.',
      },
      { value: Formality.formal, label: 'Educado e formal', body: 'Sem gírias, mais cerimonioso.' },
    ],
    emojiLegend: 'Você usa emoji?',
    emoji: [
      { value: EmojiUse.never, label: 'Não uso', body: 'Nenhum emoji nas mensagens.' },
      { value: EmojiUse.sometimes, label: 'De vez em quando', body: 'No máximo um por mensagem.' },
      { value: EmojiUse.often, label: 'Uso bastante', body: 'Faz parte do meu jeito de escrever.' },
    ],
    greeting: 'Como você cumprimenta?',
    greetingPlaceholder: 'Oi, tudo bem?',
    farewell: 'Como você se despede?',
    farewellPlaceholder: 'Abraço!',
    examples: 'Mensagens reais suas (uma por linha, de 5 a 15)',
    examplesHint:
      'Copie do seu WhatsApp respostas que você costuma mandar. Não cole nada com informação de saúde de paciente.',
    examplesCount: (count: number) => `${String(count)} de 15 mensagens`,
  },
  [Locale.enUS]: {},
});

export const KnowledgeCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'O que ele sabe responder',
    intro: 'Perguntas que os pacientes fazem e as respostas que o assistente deve dar.',
    unansweredHeading: 'Perguntas que o assistente não soube',
    unansweredHint:
      'Escreva a resposta e ela entra na base. Da próxima vez, o assistente responde sozinho.',
    answerLabel: (question: string) => `Resposta para: ${question}`,
    answerPlaceholder: 'Escreva a resposta como quer que o paciente receba',
    saveAnswer: 'Aprovar resposta',
    ignore: 'Descartar',
    asked: (count: number) =>
      count === 1 ? 'Perguntada 1 vez' : `Perguntada ${String(count)} vezes`,
    suggest: 'Sugerir uma resposta',
    suggesting: 'Escrevendo...',
    suggestHint:
      'É um rascunho: leia e ajuste antes de aprovar. Valores e horários ficam por conta do perfil e da agenda.',
    suggestFailed: 'Não consegui sugerir agora. Escreva a resposta ou tente de novo.',
    suggestOff: 'A sugestão não está ligada neste ambiente.',
    dismissed: 'Pergunta descartada.',
    baseHeading: 'Respostas cadastradas',
    empty: 'Nenhuma resposta cadastrada ainda. Comece pelas perguntas que os pacientes mais fazem.',
    add: 'Adicionar pergunta',
    question: 'Pergunta',
    questionPlaceholder: 'Tem estacionamento?',
    answer: 'Resposta',
    removeConfirm: 'Remover esta pergunta da base?',
  },
  [Locale.enUS]: {},
});
