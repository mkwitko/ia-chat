import { MoreCopy } from '@/copy';
import { SIDEBAR_QUERY, useMedia } from '@/lib/use-media';
import { ThemeToggle } from '../shell/theme-toggle';
import { MoreMenu } from './more-menu';
import { Screen } from './screen';
import { WeeklyReportToggle } from './weekly-report-toggle';

/**
 * `/mais`: on the phone, the settings list, the appearance and the notifications. On the computer
 * the list lives in the sidebar ("Configurações"), so this is the "Notificações" page.
 */
export function MoreScreen() {
  const sidebar = useMedia(SIDEBAR_QUERY);
  return (
    <Screen title={sidebar ? MoreCopy.notifications : MoreCopy.title}>
      <div className="grid gap-8 md:grid-cols-2 md:items-start md:gap-12 2xl:grid-cols-3">
        <div className="md:hidden">
          <MoreMenu />
        </div>
        <div className="px-4 md:px-0">
          <WeeklyReportToggle />
        </div>
        <section className="px-4 md:px-0">
          <ThemeToggle />
        </section>
      </div>
    </Screen>
  );
}
