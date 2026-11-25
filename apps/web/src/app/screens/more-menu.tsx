import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { MoreCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { Route } from '@/routes';
import { OperatorCopy } from '../operator/operator-copy';
import { useIsOperator } from '../operator/operator-api';
import { SetupCopy, useSetupProgress } from '../shell/setup-progress';
import { MoreItemLink, type MoreRow } from './more-item-link';

const GROUP = 'divide-y border-y bg-card md:rounded-xl md:border md:shadow-card';
const COMPACT_GROUP = 'lg:divide-y-0 lg:border-0 lg:bg-transparent lg:shadow-none';

function useRows(): MoreRow[] {
  const setup = useSetupProgress();
  const operator = useIsOperator();
  const rows: MoreRow[] = [...MoreCopy.items];
  if (setup) {
    const label = SetupCopy.label(setup.done, setup.total);
    rows.unshift({ label, hint: setup.currentTitle, to: Route.onboarding });
  }
  if (operator) rows.push({ label: OperatorCopy.title, hint: '', to: Route.operator });
  return rows;
}

/** The settings list of "Mais". `compact` is the desktop column: labels only. */
export function MoreMenu({ compact = false }: Readonly<{ compact?: boolean }>) {
  const rows = useRows();
  return (
    <div className="grid gap-6">
      <ul className={cn(GROUP, compact && COMPACT_GROUP)}>
        {rows.map((row) => (
          <li key={row.label}>
            <MoreItemLink row={row} compact={compact} />
          </li>
        ))}
      </ul>
      <SignOutRow compact={compact} />
    </div>
  );
}

/** Sair: a destructive row, the last one of the list. */
function SignOutRow({ compact }: Readonly<{ compact: boolean }>) {
  const navigate = useNavigate();
  async function signOut() {
    await authClient.signOut();
    void navigate(Route.login, { replace: true });
  }
  return (
    <div className={cn(GROUP, compact && COMPACT_GROUP)}>
      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:min-h-10 lg:rounded-md lg:px-3 lg:text-sm"
        onClick={() => void signOut()}
      >
        <LogOut className="size-4" aria-hidden="true" />
        {MoreCopy.signOut}
      </button>
    </div>
  );
}
