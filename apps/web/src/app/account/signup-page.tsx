import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { TextField } from '../setup/fields';
import { AccountCopy, SignUpCopy as Copy } from './account-copy';
import { EmailField, NewPasswordField } from './account-fields';
import { panelUrl } from './auth-errors';
import { AuthFrame, FormAlert } from './auth-frame';
import { CheckEmail } from './check-email';
import { useAuthAction } from './use-auth-action';

/** Spec 09, step 1: create the account; the email link signs in and opens "Seu consultório". */
export function SignUpPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  if (sentTo) return <CheckEmail email={sentTo} />;
  return (
    <AuthFrame
      title={Copy.title}
      subtitle={Copy.subtitle}
      footer={{ to: Route.login, label: Copy.haveAccount }}
    >
      <SignUpForm onSent={setSentTo} />
    </AuthFrame>
  );
}

function SignUpForm({ onSent }: Readonly<{ onSent: (email: string) => void }>) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAuthAction();
  const submit = async () => {
    const ok = await action.run(() =>
      authClient.signUp.email({ name, email, password, callbackURL: panelUrl(Route.start) }),
    );
    if (ok) onSent(email);
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
        id="signup-name"
        label={AccountCopy.name}
        value={name}
        onChange={setName}
        autoComplete="name"
        required
        maxLength={80}
      />
      <EmailField id="signup-email" value={email} onChange={setEmail} />
      <NewPasswordField id="signup-password" value={password} onChange={setPassword} />
      <FormAlert message={action.error} />
      <Button type="submit" disabled={action.pending}>
        {action.pending ? Copy.submitting : Copy.submit}
      </Button>
    </form>
  );
}
