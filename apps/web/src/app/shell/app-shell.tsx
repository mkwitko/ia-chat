import { Navigate, Outlet } from 'react-router';
import { LoadingCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { AlertBar } from './alert-bar';
import { Navigation } from './navigation';

/** Signed-in frame: alert strip, navigation and the current screen. */
export function AppShell() {
  const session = authClient.useSession();
  if (session.isPending) return <p className="p-6 text-sm text-muted-foreground">{LoadingCopy}</p>;
  if (!session.data) return <Navigate to={Route.login} replace />;
  // ponytail: no service alerts or pending count until the inbox exists (E-16); props are wired.
  return (
    <div className="flex h-full flex-col">
      <AlertBar alert={null} />
      <div className="flex min-h-0 flex-1">
        <Navigation pending={0} />
        <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
