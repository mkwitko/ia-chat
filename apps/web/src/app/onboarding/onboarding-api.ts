import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/onboarding/*; the web does not import server code.

// Order of the guided flow (H-37, H-39); the server sends the steps already in this order.
export const Step = {
  account: 'account',
  whatsapp: 'whatsapp',
  services: 'services',
  hours: 'hours',
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
  hoursSet: boolean;
  /** What is left for after the activation (Início), as facts. */
  checklist: {
    tone: boolean;
    reviewLink: boolean;
    packages: number;
    unanswered: number;
    team: boolean;
  };
}

/** POST /api/onboarding/prefill: a suggestion for the review screen; nothing is saved. */
export interface PrefillSuggestion {
  name: string | null;
  description: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  social: string | null;
  hours: { weekday: number; start: string; end: string }[];
  services: { name: string; durationMinutes: number | null; priceCents: number | null }[];
  packages: { name: string; priceCents: number }[];
}

/** Error codes of the prefill (422 and 503). */
export const PrefillError = {
  pasteText: 'paste_text',
  unreadable: 'page_unreadable',
  off: 'prefill_off',
  failed: 'prefill_failed',
} as const;

/** Error codes of PUT /api/onboarding/steps/:step (409): what the step still needs. */
export const StepBlock = {
  documentRequired: 'document_required',
  whatsappNotConnected: 'whatsapp_not_connected',
  hoursRequired: 'hours_required',
} as const;

const PATH = '/api/onboarding';
const POST = 'POST';
const PUT = 'PUT';
export const ONBOARDING_KEY = [PATH];
const KEY = ONBOARDING_KEY;

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
export const usePrefill = () =>
  useMutation({
    mutationFn: (source: string) =>
      api<{ suggestion: PrefillSuggestion }>(`${PATH}/prefill`, { method: POST, body: { source } }),
  });
