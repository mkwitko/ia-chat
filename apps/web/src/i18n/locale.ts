// The panel's language. pt-BR is the product language (RN-56); en-US is a skeleton that falls
// back to pt-BR key by key. The choice is read once at start: changing it reloads the page.

export const Locale = { ptBR: 'pt-BR', enUS: 'en-US' } as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

export const DEFAULT_LOCALE = Locale.ptBR;
const STORAGE_KEY = 'ca-locale';
const LOCALES = new Set<string>(Object.values(Locale));

const isLocale = (value: string | null): value is Locale => value !== null && LOCALES.has(value);

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** The active locale for this page load. */
export const locale: Locale = readLocale();

/** Dates, numbers and money, always through the active locale (Intl). */
export const formatNumber = (value: number) => value.toLocaleString(locale);
export const dateFormat = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, options);
