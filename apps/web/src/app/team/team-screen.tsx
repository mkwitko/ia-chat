import { useState } from 'react';
import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen } from '../screens/screen';
import { TextField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { useInvite, useInvitations, useMembers } from './team-api';
import { InviteRows, MemberRows, RoleSelect } from './team-lists';
import { TeamCopy as Copy, TeamRole } from './team-copy';

/** Spec 10, "Mais > Equipe": the owner invites, resends, revokes, changes roles and removes. */
export function TeamScreen() {
  const role = authClient.useActiveMember().data?.role;
  return (
    <Screen title={Copy.title}>
      <BackLink to={Route.more} label={CommonCopy.more} />
      <p className="px-4 pb-2 text-muted-foreground md:px-0">{Copy.intro}</p>
      {role && role !== TeamRole.owner ? (
        <p className="px-4 pt-4 md:px-0">{Copy.ownerOnly}</p>
      ) : (
        <TeamContent />
      )}
    </Screen>
  );
}

function TeamContent() {
  const members = useMembers();
  const invitations = useInvitations();
  if (members.isPending || invitations.isPending) return <ListSkeleton />;
  if (members.isError || invitations.isError)
    return (
      <LoadError
        message={Copy.loadFailed}
        onRetry={() => {
          void members.refetch();
          void invitations.refetch();
        }}
      />
    );
  return (
    <div className="grid gap-10 pt-4 pb-10 md:max-w-2xl">
      <MemberRows items={members.data} />
      <InviteRows items={invitations.data} />
      <InviteForm />
    </div>
  );
}

function useSendInvite(onSent: () => void) {
  const invite = useInvite();
  const send = (input: { email: string; role: string }) => {
    invite.mutate(input, {
      onSuccess: () => {
        onSent();
        toast.success(Copy.sent);
      },
      onError: () => notifyError(Copy.failed),
    });
  };
  return { send, pending: invite.isPending };
}

function InviteForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(TeamRole.receptionist);
  const invite = useSendInvite(() => {
    setEmail('');
  });
  return (
    <form
      className="grid max-w-2xl gap-3 px-4 md:px-0"
      onSubmit={(event) => {
        event.preventDefault();
        invite.send({ email: email.trim().toLowerCase(), role });
      }}
    >
      <h2 className="text-lg">{Copy.inviteHeading}</h2>
      <TextField
        id="team-email"
        label={Copy.email}
        value={email}
        onChange={setEmail}
        type="email"
        inputMode="email"
        autoComplete="off"
        required
        placeholder={Copy.emailPlaceholder}
      />
      <RoleSelect
        id="team-role"
        label={Copy.role}
        value={role}
        roles={[TeamRole.receptionist, TeamRole.professional]}
        onChange={setRole}
      />
      <Button type="submit" className="w-fit" disabled={invite.pending}>
        {invite.pending ? Copy.sending : Copy.send}
      </Button>
    </form>
  );
}
