// M-10 (spec 11, "Recuperação de lead"): one message to a lead who went quiet, with a text the
// owner approved. Defaults are conservative: off, two days, the text only counts once confirmed.

export const LEAD_FOLLOW_UP_DEFAULT_DAYS = 2;
export const LEAD_FOLLOW_UP_MIN_DAYS = 1;
export const LEAD_FOLLOW_UP_MAX_DAYS = 14;
/** A lead that went quiet longer ago than this (beyond the wait) is left alone. */
export const LEAD_FOLLOW_UP_LOOKBACK_DAYS = 7;
export const LEAD_FOLLOW_UP_MAX_TEXT = 600;

/** Suggested wording; it never goes out until the owner saves it as approved. */
export const LEAD_FOLLOW_UP_DEFAULT_TEXT =
  'Oi! Vi que a gente conversou e ficou faltando fechar um horário. Se ainda tiver interesse, é só me dizer um dia e um período que ficam bons para você. Se não for mais o caso, sem problema.';
