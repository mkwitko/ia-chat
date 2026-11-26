import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/growth/*-routes.ts (the web does not import server code).

export const GrowthPath = {
  leadFollowUp: '/api/growth/lead-follow-up',
  reviewRequest: '/api/growth/review-request',
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

export interface ReviewRequestView {
  enabled: boolean;
  delayHours: number;
  /** From the business profile; null means the switch cannot be turned on. */
  reviewLink: string | null;
  defaultDelayHours: number;
}

export type ReviewRequestInput = Pick<ReviewRequestView, 'enabled' | 'delayHours'>;

export const useReviewRequest = () =>
  useQuery({
    queryKey: [GrowthPath.reviewRequest],
    queryFn: () => api<ReviewRequestView>(GrowthPath.reviewRequest),
  });

export function useSaveReviewRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviewRequestInput) =>
      api<ReviewRequestView>(GrowthPath.reviewRequest, { method: PUT, body }),
    onSuccess: (data) => client.setQueryData([GrowthPath.reviewRequest], data),
  });
}
