import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
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

export const collections = { help };
