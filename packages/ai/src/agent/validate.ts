import { Sensitivity } from '@app/core';
import { ActionKind, type ToolFacts } from './facts.ts';

export { factsFromToolOutputs, type ToolFacts, type ToolOutput } from './facts.ts';

// Spec 04, "Validação da saída": deterministic checks before anything is sent.

export const Violation = {
  empty: 'empty',
  tooLong: 'too_long',
  systemMarkup: 'system_markup',
  forbiddenPrice: 'forbidden_price',
  unknownPrice: 'unknown_price',
  unknownTime: 'unknown_time',
  unconfirmedAction: 'unconfirmed_action',
  /** H-52: said the payment arrived without a paid deposit from a tool. */
  unconfirmedPayment: 'unconfirmed_payment',
  forbiddenTerm: 'forbidden_term',
  clinicalConduct: 'clinical_conduct',
} as const;
export type Violation = (typeof Violation)[keyof typeof Violation];

export interface ReplyRules {
  catalogCents: readonly number[];
  pricesForbidden: boolean;
  /** Clinical conduct is checked only for `health` segments. */
  sensitivity: Sensitivity;
  /** Specialty terms (promises of result, "cura"...). */
  forbiddenTerms: readonly string[];
  /** HH:MM allowed without a tool: opening hours and existing appointments. */
  allowedTimes: readonly string[];
  facts: ToolFacts;
}

const MAX_CHARS = 900;
const CENTS_PER_REAL = 100;
const LAST_HOUR = 23;
// Digits and dots, then optional cents; a trailing period is punctuation ("R$ 180.").
const MONEY = /R\$\s?([\d.]+)(?:,(\d{2}))?/g;
const TRAILING_DOT = /\.$/;
const REAIS = /\d\s?reais\b/i;
// "15h", "15h30", "16:30": hours, a colon or "h", optional minutes.
const TIME = /(\d{1,2})[:h](\d{0,2})\b/gi;
const SYSTEM_MARKUP = /<\/?[a-z_]+>|\{\s*"|\[\s*\{/i;
const FIRST_PERSON_CLAIM = /\b(?:agendei|marquei|cancelei|desmarquei|remarquei)\b/gi;
const STATE_CLAIM =
  /\b(?:está|esta|ficou|foi|estão|ficaram|foram) (?:agendad|marcad|cancelad|desmarcad|remarcad|confirmad)/gi;
// "Recebemos o Pix", "o sinal foi confirmado": past tense only; "quando for confirmado" is fine.
const PAYMENT_CLAIMS = [
  /\b(?:recebi|recebemos|confirmei|confirmamos)\b[^.!?\n]{0,30}\b(?:pix|pagamento|sinal|transfer[êe]ncia|valor)\b/i,
  /\b(?:pix|pagamento|sinal|transfer[êe]ncia)\b[^.!?\n]{0,20}\b(?:foi|est[áa]|ficou) (?:recebid|confirmad|compensad|aprovad)/i,
];
const CLINICAL = [
  /\btome\b/i,
  /relaxante muscular/i,
  /anti-?inflamat/i,
  /\b(dipirona|ibuprofeno|paracetamol|nimesulida)\b/i,
  /compressa/i,
  /bolsa de gelo/i,
  /fa[çc]a alongamento/i,
  /repouso absoluto/i,
  /voc[êe] tem (uma )?h[ée]rnia/i,
];
const MIN_STEM_LENGTH = 6;
const DOTS = /\./g;
const PAD = 2;

export function validateReply(text: string, rules: ReplyRules): Violation[] {
  if (!text.trim()) return [Violation.empty];
  const found = [
    text.length > MAX_CHARS ? Violation.tooLong : null,
    SYSTEM_MARKUP.test(text) ? Violation.systemMarkup : null,
    priceViolation(text, rules),
    timeViolation(text, rules),
    claimViolation(text, rules.facts),
    PAYMENT_CLAIMS.some((claim) => claim.test(text)) &&
    !rules.facts.actions.includes(ActionKind.paid)
      ? Violation.unconfirmedPayment
      : null,
    rules.forbiddenTerms.some((term) => termPattern(term).test(text))
      ? Violation.forbiddenTerm
      : null,
    rules.sensitivity === Sensitivity.health && CLINICAL.some((pattern) => pattern.test(text))
      ? Violation.clinicalConduct
      : null,
  ];
  return found.filter((violation) => violation !== null);
}

function priceViolation(text: string, rules: ReplyRules): Violation | null {
  const values = [...text.matchAll(MONEY)].map(
    ([, reais = '0', cents = '0']) =>
      Number(reais.replace(TRAILING_DOT, '').replace(DOTS, '')) * CENTS_PER_REAL + Number(cents),
  );
  if (rules.pricesForbidden)
    return values.length || REAIS.test(text) ? Violation.forbiddenPrice : null;
  const known = new Set([...rules.catalogCents, ...rules.facts.cents]);
  return values.some((value) => !known.has(value)) ? Violation.unknownPrice : null;
}

function timeViolation(text: string, rules: ReplyRules): Violation | null {
  const allowed = new Set([...rules.allowedTimes, ...rules.facts.times]);
  return timesIn(text).some((time) => !allowed.has(time)) ? Violation.unknownTime : null;
}

/** Every time of day written in a text, as HH:MM. Also used to allow the profile's own times. */
export function timesIn(text: string): string[] {
  return [...text.matchAll(TIME)]
    .map(([, hours = '', minutes = '']) => ({
      hours: Number(hours),
      minutes: minutes.padEnd(PAD, '0'),
    }))
    .filter(({ hours }) => hours <= LAST_HOUR)
    .map(({ hours, minutes }) => `${String(hours).padStart(PAD, '0')}:${minutes}`);
}

function claimViolation(text: string, facts: ToolFacts): Violation | null {
  for (const [claim] of [...text.matchAll(FIRST_PERSON_CLAIM), ...text.matchAll(STATE_CLAIM)]) {
    if (!facts.actions.includes(actionOf(claim.toLowerCase()))) return Violation.unconfirmedAction;
  }
  return null;
}

function actionOf(claim: string): ActionKind {
  if (claim.includes('remarc')) return ActionKind.rescheduled;
  if (claim.includes('cancel') || claim.includes('desmarc')) return ActionKind.cancelled;
  return ActionKind.booked;
}

/** Long terms also match their inflections ("garantido" → "garantida"). */
function termPattern(term: string): RegExp {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const stem = escaped.length >= MIN_STEM_LENGTH ? escaped.slice(0, -1) + String.raw`\w*` : escaped;
  return new RegExp(String.raw`\b${stem}\b`, 'i');
}
