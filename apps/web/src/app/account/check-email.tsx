import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { AccountCopy, CheckEmailCopy as Copy } from './account-copy';
import { panelUrl } from './auth-errors';
import { AuthFrame, FormAlert, FormNote } from './auth-frame';
import { useAuthAction } from './use-auth-action';

/** After sign-up: the link is in the inbox; resend if it did not arrive. */
export function CheckEmail({ email }: Readonly<{ email: string }>) {
  const [resent, setResent] = useState(false);
  const action = useAuthAction();
  const resend = async () => {
    const ok = await action.run(() =>
      authClient.sendVerificationEmail({ email, callbackURL: panelUrl(Route.start) }),
    );
    setResent(ok);
  };
  return (
    <AuthFrame title={Copy.title} footer={{ to: Route.login, label: AccountCopy.backToLogin }}>
      <p>{Copy.body(email)}</p>
      <FormNote message={resent ? Copy.resent : null} />
      <FormAlert message={action.error} />
      <Button variant="outline" disabled={action.pending} onClick={() => void resend()}>
        {Copy.resend}
      </Button>
    </AuthFrame>
  );
}
