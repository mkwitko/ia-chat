const ACCENTS = /[̀-ͯ]/g;
const NOT_SLUG = /[^a-z0-9]+/g;
const DASH = '-';
const SUFFIX_LENGTH = 6;
const MAX_BASE = 40;
const RADIX = 36;
const SKIP = 2; // "0." of Math.random().toString(36)

/** URL-safe, unique enough organization slug: "consultorio-dr-rafael-k3x9ab". */
export function slugFor(name: string, random: () => number = Math.random): string {
  const base = name
    .normalize('NFD')
    .replace(ACCENTS, '')
    .toLowerCase()
    .split(NOT_SLUG)
    .filter(Boolean)
    .join(DASH)
    .slice(0, MAX_BASE);
  const suffix = random()
    .toString(RADIX)
    .slice(SKIP, SKIP + SUFFIX_LENGTH);
  return [base, suffix].filter(Boolean).join(DASH);
}
