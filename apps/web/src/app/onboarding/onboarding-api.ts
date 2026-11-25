import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/onboarding/*; the web does not import server code.

// Order of the guided flow (H-37); the server sends the steps already in this order.
export const Step = {
  account: 'account',
  whatsapp: 'whatsapp',
  google: 'google',
  services: 'services',
  location: 'location',
  tone: 'tone',
  simulator: 'simulator',
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
  documentSet: boolean;
  whatsappConnected: boolean;
}

/** Error codes of PUT /api/onboarding/steps/:step (409): what the step still needs. */
export const StepBlock = {
  documentRequired: 'document_required',
  whatsappNotConnected: 'whatsapp_not_connected',
} as const;

const PATH = '/api/onboarding';
const POST = 'POST';
const PUT = 'PUT';
const KEY = [PATH];

export const useOnboarding = () =>
  useQuery({ queryKey: KEY, queryFn: () => api<OnboardingView>(PATH) });

/** After a change made outside the onboarding routes (the CPF/CNPJ, the WhatsApp). */
export function useRefreshOnboarding() {
  const client = useQueryClient();
  return () => void client.invalidateQueries({ queryKey: KEY });
}

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
