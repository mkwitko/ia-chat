import { Navigate, Outlet, useLocation } from 'react-router';
import { LoadingCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { useConversations } from '../inbox/inbox-api';
import { InboxCopy } from '../inbox/inbox-copy';
import { needsYou } from '../inbox/conversations-screen';
import { useInboxEvents } from '../inbox/use-inbox-events';
import { AlertBar } from './alert-bar';
import { Navigation } from './navigation';
import { SetupStrip } from './setup-progress';
import { useServiceAlerts } from './use-service-alerts';

/** Signed-in frame: alert strip, navigation and the current screen. */
export function AppShell() {
  const session = authClient.useSession();
  if (session.isPending) return <p className="p-6 text-sm text-muted-foreground">{LoadingCopy}</p>;
  if (!session.data) return <Navigate to={Route.login} replace />;
  // Signed in but no consultório yet (new account): create it first.
  if (!session.data.session.activeOrganizationId) return <Navigate to={Route.start} replace />;
  return <Frame />;
}

function Frame() {
  const { connected } = useInboxEvents();
  const conversations = useConversations();
  const [alert = null] = useServiceAlerts();
  // Início shows the same alert inside its status card: one status area per screen.
  const onHome = useLocation().pathname === Route.home;
  const pending = conversations.data?.filter(needsYou).length ?? 0;
  return (
    <div className="flex h-full flex-col">
      {/* At most one strip: what stops the service, else the way back to the setup. */}
      {!onHome && alert && <AlertBar alert={alert} />}
      {!alert && <SetupStrip />}
      {!connected && (
        <p role="status" className="bg-muted px-4 py-1 text-center text-xs text-muted-foreground">
          {InboxCopy.reconnecting}
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <Navigation pending={pending} />
        <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
