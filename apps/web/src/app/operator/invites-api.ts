import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/invites/*; the web does not import server code (H-37).

export const InviteState = {
  pending: 'pending',
  used: 'used',
  expired: 'expired',
  cancelled: 'cancelled',
} as const;
export type InviteState = (typeof InviteState)[keyof typeof InviteState];

export interface Invite {
  id: string;
  practiceName: string;
  email: string | null;
  state: InviteState;
  expiresAt: string;
  createdAt: string;
  usedAt: string | null;
}

export interface InviteResult {
  invite: Invite;
  /** Shown once: the token exists only in the link. */
  link: string | null;
  /** The link went to the invite's address by email. */
  emailed: boolean;
}

const PATH = '/api/operator/invites';
const POST = 'POST';
const KEY = [PATH];
export const InviteAction = { resend: 'resend', cancel: 'cancel' } as const;
export type InviteAction = (typeof InviteAction)[keyof typeof InviteAction];

export const useInvites = () =>
  useQuery({ queryKey: KEY, queryFn: () => api<Invite[]>(PATH), retry: false });

function useInviteWrite<T>(call: (input: T) => Promise<InviteResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export const useCreateInvite = () =>
  useInviteWrite((body: { practiceName: string; email: string | null }) =>
    api<InviteResult>(PATH, { method: POST, body }),
  );

export const useChangeInvite = () =>
  useInviteWrite(({ id, action }: { id: string; action: InviteAction }) =>
    api<InviteResult>(`${PATH}/${id}/${action}`, { method: POST }),
  );
