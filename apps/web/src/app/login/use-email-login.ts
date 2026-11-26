import { useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { nextPath } from './next-path';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { loginErrorMessage } from './login-error';

export const LoginField = { email: 'email', password: 'password' } as const;

/** Email and password sign-in: pending state, error message and redirect on success. */
export function useEmailLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error: failure } = await authClient.signIn.email({
      email: field(form, LoginField.email),
      password: field(form, LoginField.password),
    });
    setPending(false);
    if (failure) {
      setError(loginErrorMessage(failure.code));
      return;
    }
    void navigate(nextPath(window.location.search) ?? Route.conversations, { replace: true });
  }

  return { error, pending, submit };
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return value instanceof File ? '' : (value ?? '');
}
