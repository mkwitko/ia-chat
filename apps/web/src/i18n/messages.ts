import { DEFAULT_LOCALE, Locale, locale as activeLocale } from './locale';

// A tiny typed dictionary instead of an i18n library: each screen's messages are a plain object
// whose shape is the pt-BR resource, so every key is checked by the compiler and every
// plural or interpolation is an ordinary function. Other locales are partial and fall back to
// pt-BR key by key.

type Message = string | ((...args: never[]) => string);
type Leaf = Message | readonly unknown[];

export type Translation<T> = T extends Leaf
  ? T extends string
    ? string
    : T
  : Partial<{ readonly [K in keyof T]: Translation<T[K]> }>;

export type Resources<T> = { readonly [DEFAULT_LOCALE]: T } & Readonly<
  Record<Exclude<Locale, typeof DEFAULT_LOCALE>, Translation<NoInfer<T>>>
>;

const OBJECT = 'object';
const isBranch = (value: unknown): value is Record<string, unknown> =>
  typeof value === OBJECT && value !== null && !Array.isArray(value);

function merge<T>(base: T, override: unknown): T {
  if (!isBranch(base) || !isBranch(override)) return (override ?? base) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) out[key] = merge(base[key], value);
  return out as T;
}

/** The messages of one screen in the active locale; missing keys fall back to pt-BR. */
export function defineMessages<const T>(resources: Resources<T>, locale: Locale = activeLocale): T {
  const base = resources[DEFAULT_LOCALE];
  if (locale === DEFAULT_LOCALE) return base;
  return merge(base, resources[locale]);
}
