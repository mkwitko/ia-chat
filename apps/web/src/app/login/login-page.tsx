import { Link, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoginCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { AccountCopy } from '../account/account-copy';
import { AuthFrame } from '../account/auth-frame';
import { nextPath } from './next-path';
import { LoginField, useEmailLogin } from './use-email-login';

const GOOGLE = 'google';

export function LoginPage() {
  const session = authClient.useSession();
  if (session.data)
    return <Navigate to={nextPath(window.location.search) ?? Route.conversations} replace />;
  return (
    <AuthFrame title={LoginCopy.title} subtitle={LoginCopy.subtitle}>
      <EmailForm />
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        {LoginCopy.divider}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          void authClient.signIn.social({
            provider: GOOGLE,
            callbackURL: nextPath(window.location.search) ?? Route.conversations,
            // A Google account without an invite is refused (H-37): explain it there.
            errorCallbackURL: Route.signUp,
          })
        }
      >
        {LoginCopy.google}
      </Button>
      <div className="flex justify-between text-sm font-semibold">
        <Link to={Route.signUp} className="text-primary">
          {AccountCopy.createAccount}
        </Link>
        <Link to={Route.forgotPassword} className="text-primary">
          {AccountCopy.forgotPassword}
        </Link>
      </div>
    </AuthFrame>
  );
}

function EmailForm() {
  const { error, pending, submit } = useEmailLogin();
  const invalid = error ? true : undefined;
  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={LoginField.email}>{LoginCopy.email}</Label>
        <Input
          id={LoginField.email}
          name={LoginField.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={invalid}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={LoginField.password}>{LoginCopy.password}</Label>
        <Input
          id={LoginField.password}
          name={LoginField.password}
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={invalid}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-foreground">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? LoginCopy.submitting : LoginCopy.submit}
      </Button>
    </form>
  );
}
