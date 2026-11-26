import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LEGAL_PAGES, legalHref } from './lib/legal-pages.ts';
import { HELP_CATEGORY_IDS } from './lib/help-categories.ts';

const help = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/help' }),
  schema: z.object({
    title: z.string(),
    category: z.enum(HELP_CATEGORY_IDS),
    order: z.number(),
    summary: z.string(),
  }),
});

// Legal texts live in docs/legal (single source); only the listed files are published. Relative
// links between them (`x.md`) are rewritten to site paths before rendering.
const LEGAL_DIR = '../../docs/legal';
const MD_LINK_TARGET = /\]\(([a-z0-9-]+\.md)\)/g;

const legal = defineCollection({
  loader: {
    name: 'legal-docs',
    load: async (context) => {
      const { store } = context;
      store.clear();
      for (const page of LEGAL_PAGES) {
        const file = join(LEGAL_DIR, `${page.id}.md`);
        const body = (await readFile(file, 'utf8')).replace(
          MD_LINK_TARGET,
          (_match, target: string) => `](${legalHref(target)})`,
        );
        store.set({ id: page.id, data: {}, body, rendered: await context.renderMarkdown(body) });
      }
    },
  },
});

export const collections = { help, legal };
