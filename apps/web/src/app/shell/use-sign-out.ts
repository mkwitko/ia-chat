import { useNavigate } from 'react-router';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';

/** Ends the session and goes to the login (Mais on the phone, sidebar footer on the computer). */
export function useSignOut(): () => void {
  const navigate = useNavigate();
  return () => {
    void authClient.signOut().then(() => navigate(Route.login, { replace: true }));
  };
}
