import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { api } from '@/lib/api';
import { invitePath } from '@/routes';
import { InviteCopy as Copy } from './account-copy';
import { InviteOnly } from './invite-only';
import { InviteSignUp } from './signup-page';

// Mirrors apps/api/src/invites/invite-routes.ts (H-37).

const State = {
  pending: 'pending',
  used: 'used',
  expired: 'expired',
  cancelled: 'cancelled',
} as const;
type State = (typeof State)[keyof typeof State];

interface PublicInvite {
  state: State;
  practiceName: string | null;
  email: string | null;
}

const CLOSED: Record<Exclude<State, typeof State.pending>, string> = {
  [State.used]: Copy.used,
  [State.expired]: Copy.expired,
  [State.cancelled]: Copy.cancelled,
};

/** /convite/:token: checks the link (which also arms the sign-up), then the sign-up itself. */
export function InvitePage() {
  const { token = '' } = useParams();
  const invite = useQuery({
    queryKey: ['/api/invites', token],
    queryFn: () => api<PublicInvite>(`/api/invites/${encodeURIComponent(token)}`),
    retry: false,
    // Reading the link also sets the sign-up cookie; never serve it from a stale cache.
    staleTime: 0,
    gcTime: 0,
  });
  if (invite.isPending) return <p className="p-6 text-sm text-muted-foreground">{Copy.loading}</p>;
  if (invite.isError) return <InviteOnly message={Copy.invalid} />;
  const { state, practiceName, email } = invite.data;
  if (state !== State.pending) return <InviteOnly message={CLOSED[state]} />;
  return (
    <InviteSignUp practiceName={practiceName ?? ''} email={email} returnTo={invitePath(token)} />
  );
}
