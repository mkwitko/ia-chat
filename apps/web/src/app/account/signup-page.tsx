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
import { InviteOnly } from './invite-only';
import { useAuthAction } from './use-auth-action';

const GOOGLE = 'google';

/** /criar-conta: sign-up is invite-only (H-37); the invite link opens InviteSignUp instead. */
export function SignUpPage() {
  return <InviteOnly />;
}

interface InviteSignUpProps {
  practiceName: string;
  email: string | null;
  /** Where Google sends the person back if the sign-up is refused (the invite page itself). */
  returnTo: string;
}

/**
 * Spec 09, step 1, from an invite: Google or e-mail. The invite page already armed the http-only
 * cookie that lets the API create the account and the consultório; the guided setup follows.
 */
export function InviteSignUp({ practiceName, email, returnTo }: Readonly<InviteSignUpProps>) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  if (sentTo) return <CheckEmail email={sentTo} />;
  const google = () =>
    void authClient.signIn.social({
      provider: GOOGLE,
      callbackURL: panelUrl(Route.onboarding),
      errorCallbackURL: panelUrl(returnTo),
    });
  return (
    <AuthFrame
      title={Copy.title}
      subtitle={Copy.subtitle(practiceName)}
      footer={{ to: Route.login, label: Copy.haveAccount }}
    >
      <Button type="button" variant="outline" onClick={google}>
        {Copy.google}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{Copy.divider}</p>
      <SignUpForm initialEmail={email ?? ''} onSent={setSentTo} />
    </AuthFrame>
  );
}

interface FormProps {
  initialEmail: string;
  onSent: (email: string) => void;
}

function SignUpForm({ initialEmail, onSent }: Readonly<FormProps>) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
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
