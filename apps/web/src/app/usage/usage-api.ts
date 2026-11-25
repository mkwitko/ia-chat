import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/usage/usage-routes.ts; the web does not import server code.

export interface Usage {
  /** YYYY-MM */
  month: string;
  plan: string;
  monthlyCents: number;
  conversations: number;
  franchise: number;
  /** Not capped at 100. */
  percent: number;
  warning: boolean;
  full: boolean;
  overageConversations: number;
  overageCents: number;
  /** null: no cap. */
  capCents: number | null;
  restricted: boolean;
}

/** Mirrors GET /api/usage/meta (H-05). */
export interface MetaUsage {
  month: string;
  serviceUsed: number;
  serviceFree: number;
  serviceOver: number;
  billable: { utility: number; marketing: number };
  estimatedCostCents: number;
}

const META_PATH = '/api/usage/meta';
const USAGE_PATH = '/api/usage';
const CAP_PATH = '/api/usage/cap';
const PUT = 'PUT';

export const useUsage = () =>
  useQuery({ queryKey: [USAGE_PATH], queryFn: () => api<Usage>(USAGE_PATH) });

export function useSaveCap() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (capCents: number | null) => api(CAP_PATH, { method: PUT, body: { capCents } }),
    onSuccess: () => client.invalidateQueries({ queryKey: [USAGE_PATH] }),
  });
}

export const useMetaUsage = () =>
  useQuery({ queryKey: [META_PATH], queryFn: () => api<MetaUsage>(META_PATH) });
