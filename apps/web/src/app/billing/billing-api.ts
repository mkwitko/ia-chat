import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/billing/billing-routes.ts; the web does not import server code.

export interface BillingPlan {
  id: string;
  franchise: number;
  overageCents: number;
  monthlyCents: number;
}

export interface Billing {
  /** false: the server has no Asaas key; nothing can be charged. */
  enabled: boolean;
  plan: string;
  status: 'trial' | 'active' | 'restricted' | 'cancelled';
  subscribed: boolean;
  documentSet: boolean;
  /** ISO date of the oldest unpaid invoice, or null. */
  overdueSince: string | null;
  invoiceUrl: string | null;
  plans: BillingPlan[];
}

const BILLING_PATH = '/api/billing';
const SUBSCRIPTION_PATH = '/api/billing/subscription';
const PLAN_PATH = '/api/billing/plan';
const DOCUMENT_PATH = '/api/trial/document';
const Method = { post: 'POST', put: 'PUT', delete: 'DELETE' } as const;

export const useBilling = () =>
  useQuery({ queryKey: [BILLING_PATH], queryFn: () => api<Billing>(BILLING_PATH) });

function useBillingMutation<T>(call: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => client.invalidateQueries({ queryKey: [BILLING_PATH] }),
  });
}

export const useSubscribe = () =>
  useBillingMutation((plan: string) =>
    api(SUBSCRIPTION_PATH, { method: Method.post, body: { plan } }),
  );
export const useChangePlan = () =>
  useBillingMutation((plan: string) => api(PLAN_PATH, { method: Method.put, body: { plan } }));
export const useCancel = () =>
  useBillingMutation(() => api(SUBSCRIPTION_PATH, { method: Method.delete }));
export const useSaveDocument = () =>
  useBillingMutation((document: string) =>
    api(DOCUMENT_PATH, { method: Method.put, body: { document } }),
  );
