import { Outlet } from 'react-router';
import { MoreCopy } from '@/copy';
import { ThemeToggle } from '../shell/theme-toggle';
import { MoreMenu } from './more-menu';
import { Screen } from './screen';

/**
 * "Mais" from lg up: the settings list on the left, the chosen page on the right. On the phone
 * the list is its own screen and each page replaces it (RN-52).
 */
export function MoreLayout() {
  return (
    <div className="min-h-full lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden border-r bg-card/60 px-3 py-8 lg:block">
        <p className="px-3 pb-3 text-xs font-semibold text-muted-foreground">{MoreCopy.title}</p>
        <MoreMenu compact />
      </aside>
      <Outlet />
    </div>
  );
}

/** "Mais" itself: the list on the phone; on the computer, the appearance and account. */
export function MoreScreen() {
  return (
    <Screen title={MoreCopy.title}>
      <div className="grid gap-8">
        <div className="lg:hidden">
          <MoreMenu />
        </div>
        <section className="px-4 md:max-w-sm md:px-0">
          <ThemeToggle />
        </section>
      </div>
    </Screen>
  );
}
