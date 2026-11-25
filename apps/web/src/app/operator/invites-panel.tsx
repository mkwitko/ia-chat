import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormActions, TextField } from '../setup/fields';
import {
  InviteAction,
  InviteState,
  useChangeInvite,
  useCreateInvite,
  useInvites,
  type Invite,
} from './invites-api';
import { InvitesCopy as Copy } from './invites-copy';

const MAX_NAME = 80;

/** H-37: the only way in. Create a link, copy it, follow its state; resend or cancel a pending one. */
export function InvitesPanel() {
  const [link, setLink] = useState<string | null>(null);
  return (
    <section aria-label={Copy.heading} className="grid gap-4 rounded-xl border bg-card p-4">
      <div className="grid gap-1">
        <h2 className="text-base font-semibold">{Copy.heading}</h2>
        <p className="text-sm text-muted-foreground">{Copy.hint}</p>
      </div>
      <NewInviteForm onLink={setLink} />
      {link && <LinkBox link={link} />}
      <InviteList onLink={setLink} />
    </section>
  );
}

type OnLink = (link: string | null) => void;
const EMPTY = '';

function useNewInvite(onLink: OnLink) {
  const [practiceName, setPracticeName] = useState(EMPTY);
  const [email, setEmail] = useState(EMPTY);
  const create = useCreateInvite();
  const submit = () => {
    create.mutate(
      { practiceName, email: email.trim() || null },
      {
        onSuccess: (result) => {
          onLink(result.link);
          setPracticeName(EMPTY);
          setEmail(EMPTY);
        },
        onError: () => {
          toast.error(Copy.failed);
        },
      },
    );
  };
  return { practiceName, setPracticeName, email, setEmail, submit, pending: create.isPending };
}

function NewInviteForm({ onLink }: Readonly<{ onLink: OnLink }>) {
  const form = useNewInvite(onLink);
  return (
    <form
      className="grid gap-3"
      aria-label={Copy.newHeading}
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <h3 className="font-semibold">{Copy.newHeading}</h3>
      <TextField
        id="invite-practice"
        label={Copy.practiceName}
        value={form.practiceName}
        onChange={form.setPracticeName}
        required
        maxLength={MAX_NAME}
      />
      <TextField
        id="invite-email"
        label={Copy.email}
        hint={Copy.emailHint}
        value={form.email}
        onChange={form.setEmail}
        type="email"
        autoComplete="off"
      />
      <FormActions pending={form.pending} saveLabel={Copy.create} />
    </form>
  );
}

function LinkBox({ link }: Readonly<{ link: string }>) {
  const copy = () => {
    navigator.clipboard.writeText(link).then(
      () => toast.success(Copy.copied),
      () => toast.error(Copy.copyFailed),
    );
  };
  return (
    <div className="grid gap-2 rounded-lg bg-muted p-3">
      <label className="text-sm font-semibold" htmlFor="invite-link">
        {Copy.linkLabel}
      </label>
      <Input
        id="invite-link"
        readOnly
        value={link}
        onFocus={(event) => {
          event.target.select();
        }}
      />
      <Button type="button" onClick={copy}>
        {Copy.copy}
      </Button>
    </div>
  );
}

function InviteList({ onLink }: Readonly<{ onLink: OnLink }>) {
  const invites = useInvites();
  if (!invites.data) return null;
  if (invites.data.length === 0) return <p className="text-sm">{Copy.none}</p>;
  return (
    <ul className="grid gap-2 text-sm">
      {invites.data.map((invite) => (
        <InviteRow key={invite.id} invite={invite} onLink={onLink} />
      ))}
    </ul>
  );
}

function InviteRow({ invite, onLink }: Readonly<{ invite: Invite; onLink: OnLink }>) {
  const open = invite.state === InviteState.pending || invite.state === InviteState.expired;
  return (
    <li className="grid gap-1 border-b pb-2 last:border-0">
      <span className="flex justify-between gap-2 font-medium">
        <span>{invite.practiceName}</span>
        <span className="text-muted-foreground">{Copy.state(invite.state)}</span>
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {Copy.details(invite.createdAt, invite.expiresAt, invite.email)}
      </span>
      {open && <InviteActions id={invite.id} onLink={onLink} />}
    </li>
  );
}

/** A pending (or expired) invite: new link (the old one stops working) or cancel. */
function InviteActions({ id, onLink }: Readonly<{ id: string; onLink: OnLink }>) {
  const change = useChangeInvite();
  const run = (action: InviteAction) => {
    change.mutate(
      { id, action },
      {
        onSuccess: (result) => {
          onLink(result.link);
          toast.success(action === InviteAction.resend ? Copy.resent : Copy.cancelled);
        },
        onError: () => {
          toast.error(Copy.failed);
        },
      },
    );
  };
  return (
    <span className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={change.isPending}
        onClick={() => {
          run(InviteAction.resend);
        }}
      >
        {Copy.resend}
      </Button>
      <Button
        variant="ghost"
        disabled={change.isPending}
        onClick={() => {
          run(InviteAction.cancel);
        }}
      >
        {Copy.cancel}
      </Button>
    </span>
  );
}
