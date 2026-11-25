// Static help-center search: the index is built at build time (pages/ajuda/busca.json.ts) and
// filtered in the browser. No third-party service.

export interface HelpEntry {
  id: string;
  title: string;
  summary: string;
  category: string;
  body: string;
}

export interface SearchItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  text: string;
}

const MAX_RESULTS = 8;
const TITLE_WEIGHT = 3;
const SUMMARY_WEIGHT = 2;
const BODY_WEIGHT = 1;

/** Lowercase without accents, so "configuracao" finds "configuração". */
export function normalize(value: string): string {
  return value.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase();
}

/** Plain text from Markdown: drops link targets and formatting marks. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replaceAll(/\]\([^)]*\)/g, '')
    .replaceAll('[', ' ')
    .replaceAll(/[#*|>`_-]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

export function buildSearchIndex(entries: readonly HelpEntry[]): SearchItem[] {
  return entries.map(({ id, title, summary, category, body }) => ({
    id,
    title,
    summary,
    category,
    text: stripMarkdown(body),
  }));
}

interface Fields {
  title: string;
  summary: string;
  text: string;
}

function termPoints(fields: Fields, term: string): number {
  return (
    (fields.title.includes(term) ? TITLE_WEIGHT : 0) +
    (fields.summary.includes(term) ? SUMMARY_WEIGHT : 0) +
    (fields.text.includes(term) ? BODY_WEIGHT : 0)
  );
}

/** 0 when any word of the query is missing from the item. */
function score(item: SearchItem, terms: readonly string[]): number {
  const fields = {
    title: normalize(item.title),
    summary: normalize(item.summary),
    text: normalize(item.text),
  };
  const points = terms.map((term) => termPoints(fields, term));
  return points.includes(0) ? 0 : points.reduce((sum, value) => sum + value, 0);
}

/** Items matching every word of the query, best first. Empty query returns nothing. */
export function searchHelp(index: readonly SearchItem[], query: string): SearchItem[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return index
    .map((item) => ({ item, points: score(item, terms) }))
    .filter(({ points }) => points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, MAX_RESULTS)
    .map(({ item }) => item);
}
