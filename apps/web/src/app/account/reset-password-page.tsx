import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { AccountCopy, ResetCopy as Copy } from './account-copy';
import { NewPasswordField } from './account-fields';
import { AuthFrame, FormAlert } from './auth-frame';
import { useAuthAction } from './use-auth-action';

const TOKEN = 'token';

/** Reached from the email link: /nova-senha?token=… */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  return (
    <AuthFrame
      title={Copy.title}
      footer={{ to: Route.forgotPassword, label: AccountCopy.forgotPassword }}
    >
      <ResetForm token={params.get(TOKEN)} />
    </AuthFrame>
  );
}

function ResetForm({ token }: Readonly<{ token: string | null }>) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const action = useAuthAction();
  const submit = async () => {
    if (!token) return;
    const ok = await action.run(() => authClient.resetPassword({ newPassword: password, token }));
    if (!ok) return;
    toast.success(Copy.done);
    void navigate(Route.login, { replace: true });
  };
  // Any failure here is an expired or used link; a missing token is the same case.
  const failed = !token || action.error !== null;
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <NewPasswordField id="reset-password" value={password} onChange={setPassword} />
      <FormAlert message={failed ? Copy.invalid : null} />
      <Button type="submit" disabled={action.pending || !token}>
        {action.pending ? Copy.submitting : Copy.submit}
      </Button>
    </form>
  );
}
