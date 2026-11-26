import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { confirmThen, questionOf } from '@/components/ui/confirm-dialog';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import {
  useChangeRole,
  useInvite,
  useRemoveMember,
  useRevoke,
  type Invitation,
  type Member,
} from './team-api';
import { ROLE_LABEL, TeamCopy as Copy, TeamRole } from './team-copy';

const SELECT =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
const ROW = 'flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4';
const PICKABLE = [TeamRole.receptionist, TeamRole.professional];
const fail = () => notifyError(Copy.failed);

interface RoleSelectProps {
  id: string;
  label: string;
  value: string;
  roles: readonly string[];
  onChange: (role: string) => void;
}

export function RoleSelect({ id, label, value, roles, onChange }: Readonly<RoleSelectProps>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={SELECT}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABEL[role] ?? role}
          </option>
        ))}
      </select>
    </div>
  );
}

export function InviteRows({ items }: Readonly<{ items: Invitation[] }>) {
  return (
    <section className="grid gap-3 px-4 md:px-0">
      <h2 className="text-lg">{Copy.invitesHeading}</h2>
      {items.length === 0 && <p className="text-sm text-muted-foreground">{Copy.noInvites}</p>}
      {items.map((item) => (
        <InviteRow key={item.id} item={item} />
      ))}
    </section>
  );
}

/** Red confirmation for what cannot be undone, then `run`. */
function askDanger(question: string, confirm: string, run: () => void) {
  confirmThen({ ...questionOf(question), confirm, destructive: true }, run);
}

function InviteRow({ item }: Readonly<{ item: Invitation }>) {
  const invite = useInvite();
  const revoke = useRevoke();
  const expired = new Date(item.expiresAt) <= new Date();
  const onRevoke = () => {
    askDanger(Copy.revokeConfirm, Copy.revoke, () => {
      revoke.mutate(item.id, { onSuccess: () => toast.success(Copy.revoked), onError: fail });
    });
  };
  return (
    <div className={ROW}>
      <div className="min-w-0">
        <p className="truncate font-semibold">{item.email}</p>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABEL[item.role] ?? item.role} · {expired ? Copy.expired : Copy.pending}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          disabled={invite.isPending}
          onClick={() => {
            invite.mutate(
              { email: item.email, role: item.role, resend: true },
              { onSuccess: () => toast.success(Copy.resent), onError: fail },
            );
          }}
        >
          {Copy.resend}
        </Button>
        <Button variant="ghost" className="text-danger" onClick={onRevoke}>
          {Copy.revoke}
        </Button>
      </div>
    </div>
  );
}

export function MemberRows({ items }: Readonly<{ items: Member[] }>) {
  const me = authClient.useSession().data?.user.id;
  return (
    <section className="grid gap-3 px-4 md:px-0">
      <h2 className="text-lg">{Copy.membersHeading}</h2>
      {items.map((member) => (
        <MemberRow key={member.id} member={member} isMe={member.user.id === me} />
      ))}
    </section>
  );
}

function MemberRow({ member, isMe }: Readonly<{ member: Member; isMe: boolean }>) {
  const editable = member.role !== TeamRole.owner && !isMe;
  return (
    <div className={ROW}>
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {member.user.name}
          {isMe && <span className="font-normal text-muted-foreground"> ({Copy.you})</span>}
        </p>
        <p className="truncate text-sm text-muted-foreground">{member.user.email}</p>
      </div>
      {editable ? (
        <MemberControls member={member} />
      ) : (
        <span className="text-sm text-muted-foreground">
          {ROLE_LABEL[member.role] ?? member.role}
        </span>
      )}
    </div>
  );
}

function MemberControls({ member }: Readonly<{ member: Member }>) {
  const change = useChangeRole();
  const remove = useRemoveMember();
  return (
    <div className="flex items-end gap-2">
      <select
        aria-label={Copy.roleOf(member.user.name)}
        className={`${SELECT} w-auto`}
        value={member.role}
        onChange={(event) => {
          change.mutate(
            { memberId: member.id, role: event.target.value },
            { onSuccess: () => toast.success(Copy.roleChanged), onError: fail },
          );
        }}
      >
        {PICKABLE.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABEL[role]}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        className="text-danger"
        onClick={() => {
          askDanger(Copy.removeConfirm(member.user.name), Copy.removeAction, () => {
            remove.mutate(member.id, {
              onSuccess: () => toast.success(Copy.removed),
              onError: fail,
            });
          });
        }}
      >
        {Copy.removeMember}
      </Button>
    </div>
  );
}
