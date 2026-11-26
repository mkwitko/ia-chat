// Spec 09 prefill: the readable text of a page, small enough for one cheap model call.
// Structured data (schema.org JSON-LD) is kept: it often has the address and opening hours.

export const MAX_PAGE_TEXT = 12_000;
// ponytail: regex passes over HTML; capping the input keeps a hostile page from stalling them.
// Swap for a streaming HTML tokenizer if real sites need more than the first 200 KB.
const MAX_HTML = 200_000;

const JSON_LD = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const META_DESCRIPTION = /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i;
const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const DROP_BLOCKS = /<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const BLOCK_TAGS = /<\/?(p|div|br|li|h\d|tr|section|article|header|footer)[^>]*>/gi;
const TAGS = /<[^<>]{0,2000}>/g;
const SPACES = /[ \t\f\v\r]+/g;
const BLANK_LINES = /\n\s*\n+/g;
const NUMERIC_ENTITY = /&#(\d+);/g;
const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};
const NAMED_ENTITY = /&(amp|lt|gt|quot|#39|nbsp);/g;

function decode(text: string): string {
  return text
    .replace(NAMED_ENTITY, (entity) => ENTITIES[entity] ?? entity)
    .replace(NUMERIC_ENTITY, (_, code: string) => String.fromCodePoint(Number(code)));
}

/** Text of an HTML page (or plain text as is), structured data first, capped. */
export function pageText(page: string): string {
  const html = page.slice(0, MAX_HTML);
  const structured = [...html.matchAll(JSON_LD)].map(([, json = '']) => json.trim());
  const title = TITLE.exec(html)?.[1]?.trim() ?? '';
  const description = META_DESCRIPTION.exec(html)?.[1] ?? '';
  const body = html
    .replace(DROP_BLOCKS, ' ')
    .replace(COMMENTS, ' ')
    .replace(BLOCK_TAGS, '\n')
    .replace(TAGS, ' ');
  return decode([title, description, ...structured, body].filter(Boolean).join('\n'))
    .replace(SPACES, ' ')
    .replace(BLANK_LINES, '\n')
    .trim()
    .slice(0, MAX_PAGE_TEXT);
}
