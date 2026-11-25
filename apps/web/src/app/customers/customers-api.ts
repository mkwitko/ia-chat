import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Path as AgendaPath } from '../agenda/agenda-api';
import type {
  ConsentKind,
  CustomerDetail,
  CustomerSummary,
  LostReason,
  Origin,
  Outcome,
  Stage,
} from './customers-types';

export const HOME_KEY = ['home'];
export const CUSTOMERS_KEY = ['customers'];
export const CUSTOMER_KEY = ['customer'];

const BASE = '/api/customers';
const Method = { post: 'POST', patch: 'PATCH' } as const;

export function useCustomers(q: string, stage: Stage | null) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (stage) params.set('stage', stage);
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, q, stage],
    placeholderData: keepPreviousData,
    queryFn: () => api<CustomerSummary[]>(`${BASE}?${params}`),
  });
}

export const useCustomer = (id: string) =>
  useQuery({
    queryKey: [...CUSTOMER_KEY, id],
    queryFn: () => api<CustomerDetail>(`${BASE}/${id}`),
  });

/** Every screen that shows customers, the home counts and the agenda reload after a write. */
export function useRefreshCustomers() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      [HOME_KEY, CUSTOMERS_KEY, CUSTOMER_KEY, [AgendaPath.agenda]].map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    );
}

function useWrite<T>(call: (input: T) => Promise<unknown>) {
  const refresh = useRefreshCustomers();
  return useMutation({ mutationFn: call, onSuccess: refresh });
}

export interface CustomerPatch {
  name?: string;
  origin?: Origin;
  originRef?: string | null;
}

export const useUpdateCustomer = (id: string) =>
  useWrite((body: CustomerPatch) => api(`${BASE}/${id}`, { method: Method.patch, body }));

export interface StageChange {
  stage: Stage | null;
  lostReason?: LostReason;
}

export const useSetStage = (id: string) =>
  useWrite((body: StageChange) => api(`${BASE}/${id}/stage`, { method: Method.post, body }));

export const useRecordConsent = (id: string) =>
  useWrite((kind: ConsentKind) =>
    api(`${BASE}/${id}/consent`, { method: Method.post, body: { kind } }),
  );

export interface AttendanceInput {
  id: string;
  outcome: Outcome;
}

export const useAttendance = () =>
  useWrite(({ id, outcome }: AttendanceInput) =>
    api(`${AgendaPath.appointments}/${id}/attendance`, { method: Method.post, body: { outcome } }),
  );
