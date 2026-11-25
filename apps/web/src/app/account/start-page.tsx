import { useState } from 'react';
import { Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { LoadingCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { TextField } from '../setup/fields';
import { StartCopy as Copy } from './account-copy';
import { AuthFrame, FormAlert } from './auth-frame';
import { slugFor } from './slug';
import { useAuthAction } from './use-auth-action';

/** After the email link: create the consultório (the tenant), then set up the services. */
export function StartPage() {
  const session = authClient.useSession();
  if (session.isPending) return <p className="p-6 text-sm text-muted-foreground">{LoadingCopy}</p>;
  if (!session.data) return <Navigate to={Route.login} replace />;
  // Creating the consultório updates the session; this single redirect takes over from there.
  if (session.data.session.activeOrganizationId) return <Navigate to={Route.services} replace />;
  return (
    <AuthFrame title={Copy.title} subtitle={Copy.subtitle}>
      <StartForm />
    </AuthFrame>
  );
}

function StartForm() {
  const [name, setName] = useState('');
  const action = useAuthAction();
  const submit = async () => {
    // Creating the organization makes it the active one (Better Auth default).
    await action.run(() => authClient.organization.create({ name, slug: slugFor(name) }));
  };
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <TextField
        id="start-name"
        label={Copy.name}
        value={name}
        onChange={setName}
        required
        maxLength={80}
        placeholder={Copy.namePlaceholder}
      />
      <FormAlert message={action.error} />
      <Button type="submit" disabled={action.pending}>
        {action.pending ? Copy.submitting : Copy.submit}
      </Button>
    </form>
  );
}
