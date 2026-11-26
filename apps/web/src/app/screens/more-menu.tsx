import { LogOut } from 'lucide-react';
import { MoreCopy } from '@/copy';
import { Route } from '@/routes';
import { SetupCopy, useSetupProgress } from '../shell/setup-progress';
import { useSignOut } from '../shell/use-sign-out';
import { MoreItemLink, type MoreRow } from './more-item-link';
import { useSettingsRows } from './settings-rows';

const GROUP = 'divide-y border-y bg-card md:rounded-xl md:border md:shadow-card';

/** "Configuração · X de N" first while setup is unfinished, then the settings pages. */
function useRows(): MoreRow[] {
  const setup = useSetupProgress();
  const rows = useSettingsRows();
  if (!setup) return rows;
  const label = SetupCopy.label(setup.done, setup.total);
  return [{ label, hint: setup.currentTitle, to: Route.onboarding }, ...rows];
}

/** The settings list of "Mais" on the phone (the sidebar carries it from md up). */
export function MoreMenu() {
  const rows = useRows();
  return (
    <div className="grid gap-6">
      <ul className={GROUP}>
        {rows.map((row) => (
          <li key={row.label}>
            <MoreItemLink row={row} />
          </li>
        ))}
      </ul>
      <SignOutRow />
    </div>
  );
}

/** Sair: a destructive row, the last one of the list. */
function SignOutRow() {
  const signOut = useSignOut();
  return (
    <div className={GROUP}>
      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        onClick={signOut}
      >
        <LogOut className="size-4" aria-hidden="true" />
        {MoreCopy.signOut}
      </button>
    </div>
  );
}
