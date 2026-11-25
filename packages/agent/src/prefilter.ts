import { MessageType } from '@app/db';

// Spec 04, "Fluxo de um turno", step 1: rules that run before any model call. The word
// lists are the floor; the Jev judgments (E-14) complement them, never replace them.

export const PrefilterKind = {
  urgency: 'urgency',
  optOut: 'opt_out',
  optIn: 'opt_in',
  ignore: 'ignore',
  unsupported: 'unsupported',
  model: 'model',
} as const;
export type PrefilterKind = (typeof PrefilterKind)[keyof typeof PrefilterKind];

export interface PrefilterMessage {
  type: MessageType;
  text: string | null;
}

const URGENCY_TERMS = [
  'dor no peito',
  'falta de ar',
  'nao consigo respirar',
  'sem ar',
  'desmaiou',
  'desmaio',
  'desmaiei',
  'infarto',
  'avc',
  'derrame',
  'boca torta',
  'perdi a forca',
  'nao consigo mexer',
  'convulsao',
  'convulsionando',
  'sangramento forte',
  'sangrando muito',
  'suicid',
  'me matar',
  'acabar com tudo',
  'nao aguento mais viver',
];
const STOP_WORDS = new Set(['parar', 'pare', 'sair', 'stop', 'descadastrar', 'cancelar inscricao']);
const OPT_OUT_PHRASES = [
  'nao quero mais receber',
  'pare de me mandar',
  'parem de me mandar',
  'para de me mandar',
  'me tira da lista',
  'nao me mandem mais',
];
const OPT_IN_WORDS = new Set(['voltar', 'reativar']);
const OPT_IN_PHRASES = [
  'quero voltar a receber',
  'pode voltar a mandar',
  'volte a me mandar',
  'quero receber de novo',
];
const READABLE = new Set<MessageType>([MessageType.text, MessageType.interactive_reply]);
const DIACRITICS = /\p{Diacritic}/gu;
const SPACES = /\s+/g;
const END_PUNCTUATION = '.!?';

export function prefilter(
  messages: readonly PrefilterMessage[],
  specialtyTerms: readonly string[],
): { kind: PrefilterKind } {
  const texts = messages.map((message) => normalize(message.text ?? ''));
  const urgency = [...URGENCY_TERMS, ...specialtyTerms.map(normalize)].map(loosePattern);
  if (texts.some((value) => urgency.some((pattern) => pattern.test(value))))
    return { kind: PrefilterKind.urgency };
  if (texts.some(isOptOut)) return { kind: PrefilterKind.optOut };
  if (texts.some(isOptIn)) return { kind: PrefilterKind.optIn };
  if (messages.every((message) => message.type === MessageType.sticker))
    return { kind: PrefilterKind.ignore };
  const readable = messages.some(
    (message) => READABLE.has(message.type) || message.type === MessageType.audio,
  );
  return { kind: readable ? PrefilterKind.model : PrefilterKind.unsupported };
}

const WORDS_BETWEEN = 2;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** "dor no peito" also matches "dor forte no peito": up to two words between the term's words. */
function loosePattern(term: string): RegExp {
  const words = term.split(' ').map((word) => word.replace(REGEX_SPECIAL, String.raw`\$&`));
  return new RegExp(words.join(String.raw`(?: \S+){0,` + String(WORDS_BETWEEN) + '} '));
}

function isOptOut(value: string): boolean {
  return (
    STOP_WORDS.has(trimEndPunctuation(value)) ||
    OPT_OUT_PHRASES.some((phrase) => value.includes(phrase))
  );
}

function isOptIn(value: string): boolean {
  return (
    OPT_IN_WORDS.has(trimEndPunctuation(value)) ||
    OPT_IN_PHRASES.some((phrase) => value.includes(phrase))
  );
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(DIACRITICS, '').toLowerCase().replace(SPACES, ' ').trim();
}

function trimEndPunctuation(value: string): string {
  let end = value.length;
  while (end > 0 && END_PUNCTUATION.includes(value.charAt(end - 1))) end -= 1;
  return value.slice(0, end);
}
