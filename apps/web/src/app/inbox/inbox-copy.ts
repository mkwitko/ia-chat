// Inbox copy in pt-BR (RN-56): second person, "assistente", never "bot".

import { Author, InboxState, type MessageType } from './inbox-api';

const NEEDS_YOU = 'Precisa de você';
const WITH_ASSISTANT = 'Com o assistente';

export const StateCopy: Record<InboxState, string> = {
  [InboxState.awaitingApproval]: 'Aguardando aprovação',
  [InboxState.needsYou]: NEEDS_YOU,
  [InboxState.human]: 'Com você',
  [InboxState.assistant]: WITH_ASSISTANT,
};

export const AuthorCopy: Record<Author, string> = {
  [Author.patient]: 'Paciente',
  [Author.assistant]: 'Assistente',
  [Author.professional]: 'Você',
  [Author.system]: 'Sistema',
};

export const TypePreview: Partial<Record<MessageType, string>> = {
  audio: 'Áudio',
  image: 'Imagem',
  document: 'Documento',
  sticker: 'Figurinha',
  location: 'Localização',
  unsupported: 'Mensagem não suportada',
};

export const FilterCopy = {
  label: 'Filtrar conversas',
  all: 'Todas',
  needsYou: 'Precisam de você',
  assistant: WITH_ASSISTANT,
} as const;

export const InboxCopy = {
  noName: 'Paciente sem nome',
  loadFailed: 'Não conseguimos carregar as conversas. Confira a conexão e tente de novo.',
  retry: 'Tentar de novo',
  emptyFilter: 'Nenhuma conversa neste filtro.',
  pickOne: 'Escolha uma conversa à esquerda para ler e responder.',
  unread: (count: number) => (count === 1 ? '1 mensagem nova' : `${String(count)} mensagens novas`),
  reconnecting: 'Reconectando…',
  you: 'Você: ',
  assistantSaid: 'Assistente: ',
  noMessages: 'Sem mensagens ainda',
} as const;

export const ConversationCopy = {
  back: 'Conversas',
  loadFailed: 'Não conseguimos abrir esta conversa. Tente de novo.',
  notFound: 'Esta conversa não existe mais ou não é do seu consultório.',
  empty: 'Nenhuma mensagem nesta conversa ainda.',
  messages: 'Mensagens da conversa',
  fromPhone: 'Você (celular)',
  imported: 'Do histórico do WhatsApp',
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
  controlFailed: 'Não foi possível mudar quem responde. Tente de novo.',
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
} as const;

export const DraftCopy = {
  title: 'Rascunho do assistente',
  hint: 'Nada foi enviado ao paciente. Escolha o que fazer.',
  send: 'Enviar',
  edit: 'Editar',
  discard: 'Descartar',
  confirmDiscard: 'Descartar este rascunho?',
  confirmYes: 'Descartar',
  confirmNo: 'Manter',
  editLabel: 'Texto a enviar',
  sendEdited: 'Enviar texto editado',
  cancelEdit: 'Cancelar',
  failed: 'Não foi possível concluir. Tente de novo.',
  stale: 'Chegou mensagem nova ou a conversa mudou. O rascunho antigo saiu da tela.',
} as const;

export const PushCopy = {
  alert: 'Notificações desligadas. Você não será avisado quando um paciente precisar de você.',
  enable: 'Ativar',
  denied: 'O navegador bloqueou as notificações. Libere nas configurações do site e tente de novo.',
  failed: 'Não foi possível ativar as notificações agora.',
} as const;
