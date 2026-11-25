import { getCollection } from 'astro:content';
import { HELP_CATEGORIES } from '../../lib/help-categories.ts';
import { buildSearchIndex } from '../../lib/help-search.ts';

export async function GET() {
  const articles = await getCollection('help');
  const index = buildSearchIndex(
    articles.map(({ id, body, data }) => ({
      id,
      title: data.title,
      summary: data.summary,
      category: HELP_CATEGORIES[data.category],
      body: body ?? '',
    })),
  );
  return Response.json(index);
}
