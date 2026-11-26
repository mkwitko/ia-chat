// Spec 10, "Assistente": the questions the assistant could not answer, folded by similarity so
// the owner answers "aceita plano de saúde?" once. Plain normalization in code, no model call.

const SIMILARITY = 0.5;
const STOP_WORDS = new Set(
  'a o e de do da um uma voce voces ai ne que qual quais tem ha eh para pra por em no na se ou com ter tenho posso pode podem'.split(
    ' ',
  ),
);
const ACCENTS = /\p{Diacritic}/gu;
const NOT_WORD = /[^a-z0-9]+/g;
const PLURAL_SUFFIX = /s$/;
const MIN_STEM = 4;

export interface PendingRow {
  id: string;
  question: string;
  createdAt: Date;
}

export interface PendingGroup {
  ids: string[];
  /** The most recent wording, as the patient wrote it. */
  question: string;
  count: number;
  lastAskedAt: Date;
}

interface Key {
  text: string;
  words: Set<string>;
}
interface Bucket {
  key: Key;
  rows: PendingRow[];
}

export function normalize(question: string): string {
  return question.normalize('NFD').replace(ACCENTS, '').toLowerCase().replace(NOT_WORD, ' ').trim();
}

function keyOf(question: string): Key {
  const text = normalize(question);
  const stems = text
    .split(' ')
    .filter((word) => word && !STOP_WORDS.has(word))
    .map((word) => (word.length > MIN_STEM ? word.replace(PLURAL_SUFFIX, '') : word));
  return { text, words: new Set(stems) };
}

function similar(a: Key, b: Key): boolean {
  if (a.text === b.text) return true;
  if (a.words.size === 0 || b.words.size === 0) return false;
  const shared = [...a.words].filter((word) => b.words.has(word)).length;
  return shared / (a.words.size + b.words.size - shared) >= SIMILARITY;
}

function groupOf({ rows }: Bucket): PendingGroup {
  const lastAskedAt = new Date(Math.max(...rows.map((item) => item.createdAt.getTime())));
  const latest = rows.find((item) => item.createdAt.getTime() === lastAskedAt.getTime());
  return {
    ids: rows.map((item) => item.id),
    question: latest?.question ?? '',
    count: rows.length,
    lastAskedAt,
  };
}

export function groupPending(rows: readonly PendingRow[]): PendingGroup[] {
  const buckets: Bucket[] = [];
  for (const item of rows) {
    const key = keyOf(item.question);
    const match = buckets.find((bucket) => similar(bucket.key, key));
    if (match) match.rows.push(item);
    else buckets.push({ key, rows: [item] });
  }
  return buckets
    .map(groupOf)
    .sort((a, b) => b.count - a.count || b.lastAskedAt.getTime() - a.lastAskedAt.getTime());
}
