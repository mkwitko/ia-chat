// Inbox copy in pt-BR (RN-56): second person, "assistente", never "bot".

import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { Author, InboxState, type MessageType } from './inbox-api';

const NEEDS_YOU = 'Precisa de você';
const WITH_ASSISTANT = 'Com o assistente';

export const StateCopy: Record<InboxState, string> = defineMessages({
  [Locale.ptBR]: {
    [InboxState.awaitingApproval]: 'Resposta para aprovar',
    [InboxState.needsYou]: NEEDS_YOU,
    [InboxState.human]: 'Com você',
    [InboxState.assistant]: WITH_ASSISTANT,
  },
  [Locale.enUS]: {},
});

export const AuthorCopy: Record<Author, string> = defineMessages({
  [Locale.ptBR]: {
    [Author.patient]: 'Paciente',
    [Author.assistant]: 'Assistente',
    [Author.professional]: 'Você',
    [Author.system]: 'Sistema',
  },
  [Locale.enUS]: {},
});

export const TypePreview: Partial<Record<MessageType, string>> = defineMessages({
  [Locale.ptBR]: {
    audio: 'Áudio',
    image: 'Imagem',
    document: 'Documento',
    sticker: 'Figurinha',
    location: 'Localização',
    unsupported: 'Mensagem não suportada',
  },
  [Locale.enUS]: {},
});

export const FilterCopy = defineMessages({
  [Locale.ptBR]: {
    label: 'Filtrar conversas',
    all: 'Todas',
    needsYou: 'Precisam de você',
    assistant: WITH_ASSISTANT,
    count: (label: string, count: number) => `${label} (${String(count)})`,
  },
  [Locale.enUS]: {},
});

export const InboxCopy = defineMessages({
  [Locale.ptBR]: {
    noName: 'Paciente sem nome',
    hint: 'Aqui ficam as conversas do seu WhatsApp. As que precisam de você aparecem com o selo laranja. Toque numa conversa para ler e responder.',
    loadFailed: 'Não conseguimos carregar as conversas.',
    retry: 'Tentar de novo',
    retryHint: 'Confira a internet. Se continuar, fale com a gente em Ajuda.',
    emptyFilter: 'Nenhuma conversa neste filtro.',
    pickOne: 'Escolha uma conversa à esquerda para ler e responder.',
    unread: (count: number) =>
      count === 1 ? '1 mensagem nova' : `${String(count)} mensagens novas`,
    reconnecting: 'Reconectando…',
    you: 'Você: ',
    assistantSaid: 'Assistente: ',
    noMessages: 'Sem mensagens ainda',
    redactedShort: 'Mensagem apagada',
  },
  [Locale.enUS]: {},
});

export const ConversationCopy = defineMessages({
  [Locale.ptBR]: {
    back: 'Conversas',
    loadFailed: 'Não conseguimos abrir esta conversa.',
    notFound: 'Esta conversa não existe mais ou não é do seu consultório.',
    empty: 'Nenhuma mensagem nesta conversa ainda.',
    messages: 'Mensagens da conversa',
    fromPhone: 'Você (celular)',
    imported: 'Do histórico do WhatsApp',
    redacted: 'Mensagem apagada pela política de retenção',
    mediaUnavailable: 'Não foi possível baixar este arquivo. Peça ao paciente para reenviar.',
    mediaPending: 'Baixando o arquivo…',
    audioPlayer: 'Áudio do paciente',
    imageAlt: 'Imagem enviada pelo paciente',
    openDocument: 'Abrir documento',
    audioNoTranscript: 'Áudio. A transcrição ainda não está disponível.',
    mediaNote: (label: string) => `${label}. Abrir mídia ainda não está disponível no painel.`,
    takeOver: 'Assumir',
    handBack: 'Devolver ao assistente',
    takeOverHint: 'O assistente para de responder enquanto você estiver com a conversa.',
    handBackHint: 'Você está com a conversa. O assistente não responde até você devolver.',
    controlFailed: 'Não foi possível mudar quem responde.',
    nowYours: 'Agora a conversa está com você. O assistente não responde.',
    nowAssistant: 'A conversa voltou para o assistente.',
    controlLabel: 'Quem responde',
    tookOver: 'Você assumiu a conversa',
    gaveBack: 'Você devolveu a conversa ao assistente',
    handoff: 'O assistente passou a conversa para você',
    safety: 'A conversa foi passada para você por segurança',
    ownerEcho: 'Você respondeu pelo celular e assumiu a conversa',
    composerLabel: 'Responder ao paciente',
    composerPlaceholder: 'Escreva sua resposta',
    composerHint: 'Ao enviar por aqui, você assume a conversa.',
    send: 'Enviar',
    sending: 'Enviando…',
    sendFailed: 'Não enviamos a mensagem. Confira a conexão e tente de novo.',
    offline:
      'Sem conexão. A mensagem não foi enviada, para o paciente não receber uma resposta atrasada.',
  },
  [Locale.enUS]: {},
});

export const DraftCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Resposta do assistente para você aprovar',
    hint: 'Nada foi enviado ao paciente. Escolha o que fazer.',
    send: 'Enviar',
    edit: 'Editar',
    discard: 'Descartar',
    confirmDiscard: 'Descartar esta resposta? O paciente não recebe nada.',
    discarded: 'Resposta descartada.',
    sent: 'Resposta enviada ao paciente.',
    confirmYes: 'Descartar',
    editLabel: 'Texto a enviar',
    sendEdited: 'Enviar texto editado',
    cancelEdit: 'Cancelar',
    failed: 'Não foi possível concluir. Tente de novo.',
    stale: 'Chegou mensagem nova ou a conversa mudou. O rascunho antigo saiu da tela.',
  },
  [Locale.enUS]: {},
});

export const PushCopy = defineMessages({
  [Locale.ptBR]: {
    alert: 'Notificações desligadas. Você não será avisado quando um paciente precisar de você.',
    enable: 'Ativar',
    denied:
      'O navegador bloqueou as notificações. Libere nas configurações do site e tente de novo.',
    failed: 'Não foi possível ativar as notificações agora.',
  },
  [Locale.enUS]: {},
});
