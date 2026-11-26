// M-12 (spec 11, metric 14): one message after an attended appointment asking for a public
// review. The link is the owner's (profile); the text carries no health content.

export const REVIEW_DEFAULT_DELAY_HOURS = 3;
export const REVIEW_MIN_DELAY_HOURS = 1;
export const REVIEW_MAX_DELAY_HOURS = 48;
/** At most one request per client in this many days. */
export const REVIEW_MIN_GAP_DAYS = 90;
/** An attendance older than this (beyond the delay) never triggers a request. */
export const REVIEW_LOOKBACK_DAYS = 3;

/** What the client reads: thanks, the link, an easy way out. Written by code, never by the model. */
export function reviewRequestText(link: string): string {
  return `Oi! Foi um prazer te atender. Se puder, deixe uma avaliação rápida para ajudar outras pessoas a nos encontrar: ${link} Obrigado! Se preferir não receber mais mensagens, é só avisar.`;
}
