import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Better Auth's organization endpoints (apps/api/src/auth/organization.ts); the active tenant
// is the session's. Mirrors their payloads; the web does not import server code.

const BASE = '/api/auth/organization';
const POST = 'POST';
const TEAM_KEY = [BASE] as const;
export const InvitationStatus = { pending: 'pending' } as const;

export interface Member {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}
export interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
}

export const useMembers = () =>
  useQuery({
    queryKey: [...TEAM_KEY, 'members'],
    queryFn: async () => (await api<{ members: Member[] }>(`${BASE}/list-members`)).members,
  });

export const useInvitations = () =>
  useQuery({
    queryKey: [...TEAM_KEY, 'invitations'],
    queryFn: async () =>
      (await api<Invitation[]>(`${BASE}/list-invitations`)).filter(
        (item) => item.status === InvitationStatus.pending,
      ),
  });

function useTeamWrite<T>(path: string, body: (input: T) => object) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: T) => api(`${BASE}/${path}`, { method: POST, body: body(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: TEAM_KEY }),
  });
}

export interface InviteInput {
  email: string;
  role: string;
  resend?: boolean;
}
export const useInvite = () => useTeamWrite('invite-member', (input: InviteInput) => input);
export const useRevoke = () =>
  useTeamWrite('cancel-invitation', (invitationId: string) => ({ invitationId }));
export const useChangeRole = () =>
  useTeamWrite('update-member-role', (input: { memberId: string; role: string }) => input);
export const useRemoveMember = () =>
  useTeamWrite('remove-member', (memberIdOrEmail: string) => ({ memberIdOrEmail }));

export interface PublicTeamInvite {
  state: string;
  practiceName: string;
  email: string;
  role: string;
}
export const publicInviteKey = (id: string) => ['/api/team-invites', id] as const;
export const readPublicInvite = (id: string) =>
  api<PublicTeamInvite>(`/api/team-invites/${encodeURIComponent(id)}`);
export const acceptInvite = (invitationId: string) =>
  api(`${BASE}/accept-invitation`, { method: POST, body: { invitationId } });
