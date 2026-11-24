import { Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoginCopy, PRODUCT_NAME } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { BrandMark } from '../brand-mark';
import { LoginField, useEmailLogin } from './use-email-login';

const GOOGLE = 'google';

export function LoginPage() {
  const session = authClient.useSession();
  if (session.data) return <Navigate to={Route.conversations} replace />;
  return (
    <main className="flex min-h-full items-start justify-center px-4 py-10 sm:items-center">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex items-center gap-3">
          <BrandMark size={40} />
          <span className="text-lg">{PRODUCT_NAME}</span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl">{LoginCopy.title}</h1>
          <p className="text-sm text-muted-foreground">{LoginCopy.subtitle}</p>
        </div>
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
            void authClient.signIn.social({ provider: GOOGLE, callbackURL: Route.conversations })
          }
        >
          {LoginCopy.google}
        </Button>
      </div>
    </main>
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
