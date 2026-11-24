// Traces sent to Langfuse carry no name nor phone of the patient (RN-38).

const PHONE_MASK = '[telefone]';
const NAME_MASK = '[nome]';
// +55 optional, area code with or without parentheses, 8 or 9 digits with optional dash.
const BR_PHONE = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)9?\d{4}-?\d{4}/g;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

export function maskPersonalData(text: string, names: readonly string[]): string {
  const byLength = [...names].filter(Boolean).sort((a, b) => b.length - a.length);
  const masked = byLength.reduce(
    (current, name) => current.replace(new RegExp(escape(name), 'gi'), NAME_MASK),
    text,
  );
  return masked.replace(BR_PHONE, PHONE_MASK);
}

function escape(value: string): string {
  return value.replace(REGEX_SPECIAL, String.raw`\$&`);
}
