import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Route, teamInvitePath } from '@/routes';
import { AuthFrame, FormAlert } from '../account/auth-frame';
import { InviteOnly } from '../account/invite-only';
import { InviteSignUp } from '../account/signup-page';
import { loginPathWithNext } from '../login/next-path';
import { ROLE_LABEL, TeamInviteCopy as Copy } from './team-copy';
import { acceptInvite, publicInviteKey, readPublicInvite, type PublicTeamInvite } from './team-api';

const PENDING = 'pending';

/** /convite-equipe/:id, the link in the invitation e-mail: sign up or in, then accept. */
export function TeamInvitePage() {
  const { id = '' } = useParams();
  const session = authClient.useSession();
  const invite = useQuery({
    queryKey: publicInviteKey(id),
    queryFn: () => readPublicInvite(id),
    retry: false,
  });
  if (invite.isPending || session.isPending)
    return <p className="p-6 text-sm text-muted-foreground">{Copy.loading}</p>;
  if (invite.isError) return <InviteOnly message={Copy.invalid} />;
  const { state } = invite.data;
  if (state !== PENDING) return <InviteOnly message={Copy.closed[state] ?? Copy.invalid} />;
  const email = session.data?.user.email;
  if (!email) return <SignedOut id={id} invite={invite.data} />;
  return <Accept id={id} invite={invite.data} accountEmail={email} />;
}

function SignedOut({ id, invite }: Readonly<{ id: string; invite: PublicTeamInvite }>) {
  const returnTo = teamInvitePath(id);
  return (
    <InviteSignUp
      practiceName={invite.practiceName}
      email={invite.email}
      returnTo={returnTo}
      team={{ subtitle: Copy.signUpSubtitle(invite.practiceName) }}
      loginHref={loginPathWithNext(Route.login, returnTo)}
    />
  );
}

interface AcceptProps {
  id: string;
  invite: PublicTeamInvite;
  accountEmail: string;
}

function Accept({ id, invite, accountEmail }: Readonly<AcceptProps>) {
  const accept = useMutation({
    mutationFn: () => acceptInvite(id),
    onSuccess: () => {
      // The session now points at the new team; a full load drops every cached tenant query.
      window.location.assign(Route.home);
    },
  });
  const mine = accountEmail.toLowerCase() === invite.email.toLowerCase();
  return (
    <AuthFrame
      title={Copy.title(invite.practiceName)}
      subtitle={Copy.as(ROLE_LABEL[invite.role] ?? invite.role)}
    >
      <p className="text-sm text-muted-foreground">{Copy.signedAs(accountEmail)}</p>
      {mine ? (
        <>
          <FormAlert message={accept.isError ? Copy.failed : null} />
          <Button
            type="button"
            disabled={accept.isPending}
            onClick={() => {
              accept.mutate();
            }}
          >
            {accept.isPending ? Copy.accepting : Copy.accept}
          </Button>
        </>
      ) : (
        <>
          <FormAlert message={Copy.otherEmail(invite.email)} />
          <Button type="button" variant="outline" onClick={() => void authClient.signOut()}>
            {Copy.signOut}
          </Button>
        </>
      )}
    </AuthFrame>
  );
}
