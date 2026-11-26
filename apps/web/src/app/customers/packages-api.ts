import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CUSTOMER_KEY, useRefreshCustomers } from './customers-api';
import type { ManualReason } from './packages-copy';

// Mirrors /api/customers/:id/packages; the web does not import server code.

export interface PackageEntry {
  delta: number;
  reason: string;
  createdAt: string;
}

export interface ClientPackage {
  id: string;
  name: string;
  sessions: number;
  used: number;
  remaining: number;
  priceCents: number;
  paid: boolean;
  purchasedOn: string;
  entries: PackageEntry[];
}

export interface PackageOption {
  name: string;
  priceCents: number;
  sessions?: number;
}

interface Listing {
  packages: ClientPackage[];
  options: PackageOption[];
}

export interface PackagePurchase {
  name: string;
  sessions: number;
  priceCents: number;
  purchasedOn: string;
  paid: boolean;
}

const POST = 'POST';
const PACKAGES = 'packages';
const path = (id: string) => `/api/customers/${id}/packages`;

/** Under the customer key, so an attendance mark (which debits a session) reloads it too. */
export const usePackages = (id: string) =>
  useQuery({
    queryKey: [...CUSTOMER_KEY, id, PACKAGES],
    queryFn: () => api<Listing>(path(id)),
  });

export function useRegisterPackage(id: string) {
  const refresh = useRefreshCustomers();
  return useMutation({
    mutationFn: (body: PackagePurchase) => api(path(id), { method: POST, body }),
    onSuccess: refresh,
  });
}

export function useAdjustPackage(id: string) {
  const refresh = useRefreshCustomers();
  return useMutation({
    mutationFn: (input: { packageId: string; delta: 1 | -1; reason: ManualReason }) =>
      api(`${path(id)}/${input.packageId}/adjust`, {
        method: POST,
        body: { delta: input.delta, reason: input.reason },
      }),
    onSuccess: refresh,
  });
}
