// Filters the site's static help index (apps/site/src/pages/ajuda/busca.json.ts) in the browser.
// Same ranking as the site's own search: title above summary above body, every word must match.

export interface HelpItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  text: string;
}

const MAX_RESULTS = 5;
const TITLE_WEIGHT = 3;
const SUMMARY_WEIGHT = 2;
const BODY_WEIGHT = 1;

const normalize = (value: string) => value.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase();

function termPoints(item: HelpItem, term: string): number {
  return (
    (normalize(item.title).includes(term) ? TITLE_WEIGHT : 0) +
    (normalize(item.summary).includes(term) ? SUMMARY_WEIGHT : 0) +
    (normalize(item.text).includes(term) ? BODY_WEIGHT : 0)
  );
}

function score(item: HelpItem, terms: readonly string[]): number {
  const points = terms.map((term) => termPoints(item, term));
  return points.includes(0) ? 0 : points.reduce((sum, value) => sum + value, 0);
}

export function searchHelp(index: readonly HelpItem[], query: string): HelpItem[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return index
    .map((item) => ({ item, points: score(item, terms) }))
    .filter(({ points }) => points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, MAX_RESULTS)
    .map(({ item }) => item);
}
