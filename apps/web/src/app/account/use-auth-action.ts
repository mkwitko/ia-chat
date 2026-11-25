import { useState } from 'react';
import { authErrorMessage } from './auth-errors';

interface AuthResult {
  error: { code?: string | undefined } | null;
}

/** Pending flag and error message around one Better Auth call; returns true on success. */
export function useAuthAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(call: () => Promise<AuthResult>): Promise<boolean> {
    setPending(true);
    setError(null);
    const { error: failure } = await call();
    setPending(false);
    if (failure) setError(authErrorMessage(failure.code));
    return !failure;
  }
  return { pending, error, setError, run };
}
