import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Step } from '../onboarding/onboarding-api';

// Mirrors apps/api/src/operator/*; the web does not import server code.

export interface ClientRow {
  id: string;
  name: string;
  plan: string;
  status: string;
  channelConnected: boolean;
  conversations: number;
  franchise: number;
  revenueCents: number;
  costCents: number;
  marginCents: number;
  failedTurns: number;
  discardedTurns: number;
  handoffs: number;
}

export interface Funnel {
  signups: number;
  steps: { step: Step; count: number }[];
}

/** Mirrors apps/api/src/operator/meta-overview.ts (H-05). */
export interface MetaOverview {
  month: string;
  tenants: number;
  totals: {
    serviceUsed: number;
    serviceOver: number;
    utilityBillable: number;
    marketingBillable: number;
    estimatedCostCents: number;
  };
  top: { id: string; name: string; serviceUsed: number; estimatedCostCents: number }[];
}

export interface TenantConversations {
  costs: { conversationId: string; costCents: number }[];
  issues: { conversationId: string; state: string; turns: number }[];
  handoffs: { conversationId: string; reason: string | null }[];
}

export interface Problem {
  id: string;
  event: string;
  tenantId: string | null;
  queue: string | null;
  jobId: string | null;
  conversationId: string | null;
  turnId: string | null;
  code: string | null;
  createdAt: string;
}

export interface OwnerGrant {
  operatorEmail: string | null;
  reason: string;
  grantedAt: string;
  expiresAt: string;
}

const ME_PATH = '/api/operator/me';
const CLIENTS_PATH = '/api/operator/clients';
const FUNNEL_PATH = '/api/operator/funnel';
const META_PATH = '/api/operator/meta-usage';
const PROBLEMS_PATH = '/api/operator/problems';
const OWNER_PATH = '/api/operator-access';
const POST = 'POST';
const tenantPath = (tenantId: string, leaf: string) => `/api/operator/tenants/${tenantId}/${leaf}`;

/** True only for platform operators: everyone else gets 403 and never sees the area. */
export const useIsOperator = () =>
  useQuery({ queryKey: [ME_PATH], queryFn: () => api(ME_PATH), retry: false }).isSuccess;

export const useClients = () =>
  useQuery({
    queryKey: [CLIENTS_PATH],
    queryFn: () => api<ClientRow[]>(CLIENTS_PATH),
    retry: false,
  });

export const useFunnel = () =>
  useQuery({ queryKey: [FUNNEL_PATH], queryFn: () => api<Funnel>(FUNNEL_PATH), retry: false });

export const useMetaOverview = () =>
  useQuery({
    queryKey: [META_PATH],
    queryFn: () => api<MetaOverview>(META_PATH),
    retry: false,
  });

export const useProblems = () =>
  useQuery({
    queryKey: [PROBLEMS_PATH],
    queryFn: () => api<Problem[]>(PROBLEMS_PATH),
    retry: false,
  });

export const useOwnerGrants = () =>
  useQuery({ queryKey: [OWNER_PATH], queryFn: () => api<OwnerGrant[]>(OWNER_PATH), retry: false });

export interface GrantRequest {
  tenantId: string;
  reason: string;
  hours: number;
}

export const useRequestAccess = () =>
  useMutation({
    mutationFn: ({ tenantId, ...body }: GrantRequest) =>
      api(tenantPath(tenantId, 'access'), { method: POST, body }),
  });

export const useTenantConversations = (tenantId: string, enabled: boolean) =>
  useQuery({
    queryKey: [CLIENTS_PATH, tenantId, 'conversations'],
    queryFn: () => api<TenantConversations>(tenantPath(tenantId, 'conversations')),
    enabled,
    retry: false,
  });
