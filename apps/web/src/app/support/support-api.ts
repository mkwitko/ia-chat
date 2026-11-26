import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { HELP_URL } from '@/lib/config';
import type { HelpItem } from './help-search';

// Mirrors apps/api/src/support/support-routes.ts; the web does not import server code.

const SUPPORT_PATH = '/api/support';
const HELP_INDEX_PATH = '/ajuda/busca.json';

export interface Support {
  whatsapp: string | null;
  email: string | null;
  context: { tenant: string; plan: string; status: string };
}

export const useSupport = () =>
  useQuery({ queryKey: [SUPPORT_PATH], queryFn: () => api<Support>(SUPPORT_PATH) });

/** The site's static search index (public, CORS-open). Off when the site URL is not configured. */
export const useHelpIndex = () =>
  useQuery({
    queryKey: [HELP_INDEX_PATH],
    enabled: Boolean(HELP_URL),
    staleTime: Infinity,
    queryFn: async () => {
      const response = await fetch(new URL(HELP_INDEX_PATH, HELP_URL));
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as HelpItem[];
    },
  });
