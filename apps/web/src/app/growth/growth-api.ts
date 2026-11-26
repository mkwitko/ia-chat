import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/growth/*-routes.ts (the web does not import server code).

export const GrowthPath = {
  leadFollowUp: '/api/growth/lead-follow-up',
} as const;
const PUT = 'PUT';

export interface LeadFollowUpView {
  enabled: boolean;
  days: number;
  /** Null until the owner approves a text. */
  text: string | null;
  defaultText: string;
  defaultDays: number;
}

export type LeadFollowUpInput = Pick<LeadFollowUpView, 'enabled' | 'days'> & { text: string };

export const useLeadFollowUp = () =>
  useQuery({
    queryKey: [GrowthPath.leadFollowUp],
    queryFn: () => api<LeadFollowUpView>(GrowthPath.leadFollowUp),
  });

export function useSaveLeadFollowUp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: LeadFollowUpInput) =>
      api<LeadFollowUpView>(GrowthPath.leadFollowUp, { method: PUT, body }),
    onSuccess: (data) => client.setQueryData([GrowthPath.leadFollowUp], data),
  });
}
