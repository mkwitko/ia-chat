// RF-23b: phones are compared by a key where a Brazilian mobile with and without the
// ninth digit is the same number (old contacts and some payloads still lack it).

const BRAZIL = '55';
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;
const DDD_LENGTH = 2;
const MOBILE_WITH_NINE = 11; // DDD + 9 + 8 digits
const NINTH_DIGIT = '9';
const NON_DIGITS = /\D/g;

export function toE164(raw: string): string | null {
  const digits = raw.replace(NON_DIGITS, '');
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;
  return `+${digits}`;
}

export function phoneKey(raw: string): string | null {
  const e164 = toE164(raw);
  if (!e164?.startsWith(`+${BRAZIL}`)) return e164;
  const national = e164.slice(1 + BRAZIL.length);
  if (national.length !== MOBILE_WITH_NINE || national[DDD_LENGTH] !== NINTH_DIGIT) return e164;
  return `+${BRAZIL}${national.slice(0, DDD_LENGTH)}${national.slice(DDD_LENGTH + 1)}`;
}
