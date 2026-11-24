import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors the Prisma enums Autonomy and IdentityMode (the web does not import @app/db).
export const Autonomy = { approve: 'approve', auto: 'auto', off: 'off' } as const;
export type Autonomy = (typeof Autonomy)[keyof typeof Autonomy];

export const IdentityMode = {
  assistant: 'assistant',
  clinic: 'clinic',
  professional: 'professional',
} as const;
export type IdentityMode = (typeof IdentityMode)[keyof typeof IdentityMode];

export interface AssistantSettings {
  autonomy: Autonomy;
  identityMode: IdentityMode;
  assistantName: string;
}

export interface AssistantSettingsView extends AssistantSettings {
  professionalName: string;
}

const PATH = '/api/assistant/settings';
const KEY = ['assistant-settings'];
const PUT = 'PUT';

export function useAssistantSettings() {
  return useQuery({ queryKey: KEY, queryFn: () => api<AssistantSettingsView>(PATH) });
}

export function useSaveAssistantSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AssistantSettings) => api<AssistantSettings>(PATH, { method: PUT, body }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
