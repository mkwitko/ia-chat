import { Navigate } from 'react-router';
import { LoadingCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { InviteCopy } from './account-copy';
import { InviteOnly } from './invite-only';

/**
 * After the email link: the invite already opened the consultório (H-37), so this only hands over
 * to the guided setup. Someone without a consultório (no invite) is told how to get one.
 */
export function StartPage() {
  const session = authClient.useSession();
  if (session.isPending) return <p className="p-6 text-sm text-muted-foreground">{LoadingCopy}</p>;
  if (!session.data) return <Navigate to={Route.login} replace />;
  if (session.data.session.activeOrganizationId) return <Navigate to={Route.onboarding} replace />;
  return <InviteOnly message={InviteCopy.noPractice} />;
}
