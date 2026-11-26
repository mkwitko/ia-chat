import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ChannelStatus } from './whatsapp-api';

// Mirrors apps/api/src/whatsapp/qr-routes.ts (E-09b); the web does not import server code.

export const QrSessionState = {
  qr: 'qr',
  starting: 'starting',
  failed: 'failed',
  unreachable: 'unreachable',
} as const;
export type QrSessionState = (typeof QrSessionState)[keyof typeof QrSessionState];

export interface QrImage {
  mimetype: string;
  data: string;
}

export interface QrChannel {
  status: ChannelStatus;
  displayPhone: string | null;
  /** Live session while not connected; null once connected. */
  session: { state: QrSessionState; qr?: QrImage } | null;
}

export interface QrStatus {
  available: boolean;
  termsVersion: string;
  channel: QrChannel | null;
}

const BASE = '/api/whatsapp/qr';
const POST = 'POST';
// The first QR code lasts 60 s, then 20 s each (WAHA): poll well inside that.
const POLL_MS = 3_000;

export const useQrStatus = () =>
  useQuery({
    queryKey: [BASE],
    queryFn: () => api<QrStatus>(BASE),
    refetchInterval: (query) => {
      const channel = query.state.data?.channel;
      return channel && channel.status !== ChannelStatus.connected ? POLL_MS : false;
    },
  });

function useWrite<T>(call: (input: T) => Promise<QrStatus>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: (status) => {
      client.setQueryData([BASE], status);
    },
  });
}

/** RF-27: the accept of this version of the term goes with the request and to the audit log. */
export const useQrConnect = () =>
  useWrite((version: string) =>
    api<QrStatus>(`${BASE}/connect`, { method: POST, body: { accepted: true, version } }),
  );

export const useQrRestart = () =>
  useWrite(() => api<QrStatus>(`${BASE}/restart`, { method: POST, body: {} }));
