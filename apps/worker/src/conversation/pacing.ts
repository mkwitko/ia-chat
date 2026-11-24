// Spec 03, "Execução do turno", step 3: the answer arrives in a plausible time, never
// with an artificial delay above 8 s, and processing time counts towards it.

const BASE_MS = 1500;
const CHARS_PER_SECOND = 40;
const MS_PER_SECOND = 1000;
const MAX_MS = 8000;

export function targetDelayMs(text: string): number {
  const typing = BASE_MS + (text.length / CHARS_PER_SECOND) * MS_PER_SECOND;
  return Math.min(MAX_MS, Math.max(BASE_MS, typing));
}

export function pacedDelayMs(text: string, elapsedMs: number): number {
  return Math.max(0, targetDelayMs(text) - elapsedMs);
}
