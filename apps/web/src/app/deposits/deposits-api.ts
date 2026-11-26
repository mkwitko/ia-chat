import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/deposits/*-routes.ts (H-52, spec 05 "Sinal via Pix").

export const DepositPath = {
  list: '/api/deposits',
  settings: '/api/deposits/settings',
  confirm: (id: string) => `/api/deposits/${id}/confirm`,
} as const;
const POST = 'POST';
const PUT = 'PUT';

export interface PendingDeposit {
  id: string;
  amountCents: number;
  expiresAt: string;
  startsAt: string;
  serviceName: string;
  contactId: string;
  contactName: string | null;
}

export interface DepositSettings {
  pixKey: string;
  receiverName: string;
  city: string;
  holdMinutes: number;
  refundPolicy: string | null;
}

export interface DepositService {
  id: string;
  name: string;
  priceCents: number;
  depositCents: number | null;
}

export interface DepositSettingsView {
  settings: DepositSettings | null;
  services: DepositService[];
  feature: { included: boolean; enabled: boolean } | undefined;
}

export type DepositSettingsInput = DepositSettings & {
  services: { id: string; depositCents: number | null }[];
};

export const usePendingDeposits = () =>
  useQuery({
    queryKey: [DepositPath.list],
    queryFn: () => api<PendingDeposit[]>(DepositPath.list),
  });

export function useConfirmDeposit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ status: string }>(DepositPath.confirm(id), { method: POST }),
    onSettled: () => client.invalidateQueries({ queryKey: [DepositPath.list] }),
  });
}

export const useDepositSettings = () =>
  useQuery({
    queryKey: [DepositPath.settings],
    queryFn: () => api<DepositSettingsView>(DepositPath.settings),
  });

export function useSaveDepositSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: DepositSettingsInput) =>
      api<DepositSettingsView>(DepositPath.settings, { method: PUT, body }),
    onSuccess: (data) => client.setQueryData([DepositPath.settings], data),
  });
}
