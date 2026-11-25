import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { AccountCopy, ForgotCopy as Copy } from './account-copy';
import { EmailField } from './account-fields';
import { panelUrl } from './auth-errors';
import { AuthFrame, FormAlert, FormNote } from './auth-frame';
import { useAuthAction } from './use-auth-action';

export function ForgotPasswordPage() {
  return (
    <AuthFrame
      title={Copy.title}
      subtitle={Copy.subtitle}
      footer={{ to: Route.login, label: AccountCopy.backToLogin }}
    >
      <ForgotForm />
    </AuthFrame>
  );
}

/** The answer never says whether the email has an account (no account enumeration). */
function ForgotForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const action = useAuthAction();
  const submit = async () => {
    const ok = await action.run(() =>
      authClient.requestPasswordReset({ email, redirectTo: panelUrl(Route.resetPassword) }),
    );
    setSent(ok);
  };
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <EmailField id="forgot-email" value={email} onChange={setEmail} />
      <FormNote message={sent ? Copy.sent : null} />
      <FormAlert message={action.error} />
      <Button type="submit" disabled={action.pending}>
        {action.pending ? Copy.submitting : Copy.submit}
      </Button>
    </form>
  );
}
