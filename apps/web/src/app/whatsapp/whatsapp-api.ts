import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/whatsapp/*; the web does not import server code.

export const ChannelStatus = {
  pending: 'pending',
  connected: 'connected',
  disconnected: 'disconnected',
  restricted: 'restricted',
} as const;
export type ChannelStatus = (typeof ChannelStatus)[keyof typeof ChannelStatus];

export interface FriendlyError {
  message: string;
  action: string;
}

export interface WhatsappChannel {
  status: ChannelStatus;
  displayPhone: string | null;
  coexistence: boolean;
  ready: boolean;
  /** Spec 03 step 3: a card is on the client's WhatsApp account at Meta. */
  paymentMethod: boolean;
  error: FriendlyError | null;
}

export interface WhatsappStatus {
  available: boolean;
  /** Public ids for the Facebook SDK; present only when the connection is available. */
  appId?: string;
  configId?: string;
  channel: WhatsappChannel | null;
}

export interface SignupResult {
  code: string;
  wabaId: string;
  phoneNumberId?: string;
  coexistence: boolean;
}

/** Error codes the API sends for this flow. */
export const WhatsappError = {
  taken: 'whatsapp_taken',
  failed: 'whatsapp_failed',
} as const;

const BASE = '/api/whatsapp';
const POST = 'POST';

export const useWhatsappStatus = () =>
  useQuery({ queryKey: [BASE], queryFn: () => api<WhatsappStatus>(BASE) });

function useWrite<T>(call: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSettled: () => client.invalidateQueries({ queryKey: [BASE] }),
  });
}

export const useFinishSignup = () =>
  useWrite((result: SignupResult) => api(`${BASE}/connect`, { method: POST, body: result }));

export const useRetrySetup = () => useWrite(() => api(`${BASE}/retry`, { method: POST, body: {} }));
