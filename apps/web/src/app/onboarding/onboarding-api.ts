import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/onboarding/*; the web does not import server code.

export const Step = {
  account: 'account',
  services: 'services',
  location: 'location',
  tone: 'tone',
  simulator: 'simulator',
  whatsapp: 'whatsapp',
  google: 'google',
  activation: 'activation',
} as const;
export type Step = (typeof Step)[keyof typeof Step];

export const Status = { done: 'done', skipped: 'skipped' } as const;
export type Status = (typeof Status)[keyof typeof Status];

export interface OnboardingView {
  steps: { step: Step; status: Status | null }[];
  current: Step | null;
  specialty: string | null;
  pricesForbidden: boolean;
  specialties: { specialty: string; label: string }[];
}

const PATH = '/api/onboarding';
const POST = 'POST';
const PUT = 'PUT';
const KEY = [PATH];

export const useOnboarding = () =>
  useQuery({ queryKey: KEY, queryFn: () => api<OnboardingView>(PATH) });

function useWrite<T>(call: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export const useSaveStep = () =>
  useWrite(({ step, status }: { step: Step; status: Status }) =>
    api(`${PATH}/steps/${step}`, { method: PUT, body: { status } }),
  );
export const useChooseSpecialty = () =>
  useWrite((specialty: string) => api(`${PATH}/specialty`, { method: POST, body: { specialty } }));
export const useApplyTemplate = () => useWrite(() => api(`${PATH}/template`, { method: POST }));
