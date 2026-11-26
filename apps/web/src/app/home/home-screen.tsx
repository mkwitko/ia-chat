import type { ReactNode } from 'react';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EmptyState } from '../screens/empty-state';
import { HelpArticle } from '../screens/screen-help';
import { Screen } from '../screens/screen';
import { SimulatorLink } from '../simulator/simulator-link';
import { AttentionSection, hasAttention, ToMarkSection } from './attention-section';
import { ResultsLink, TodaySection } from './day-sections';
import { FirstBookingMoment } from './first-booking';
import { useHome, type HomeView } from './home-api';
import { HomeCopy as Copy } from './home-copy';
import { StatusCard, useTopStatus } from './status-card';
import { isUrgent } from './status-model';

const isEmptyAccount = (home: HomeView) =>
  home.month.contacts === 0 && home.today.length === 0 && !hasAttention(home);

/**
 * Spec 10, "Início", cut to what a phone shows at a glance (round 3): what cannot wait, what needs
 * the owner, today. "All fine" and tips wait at the bottom; the month is one link away.
 */
export function HomeScreen() {
  const home = useHome();
  const status = useTopStatus();
  const urgent = isUrgent(status);
  const quiet = urgent ? null : (
    <div className="pt-8">
      <StatusCard status={status} />
    </div>
  );
  return (
    <Screen title={Copy.title} help={HelpArticle.home} hint={Copy.hint}>
      {urgent && <StatusCard status={status} />}
      {home.isPending && <ListSkeleton />}
      {home.isError && (
        <LoadError
          message={Copy.loadFailed}
          hint={Copy.loadFailedHint}
          onRetry={() => void home.refetch()}
        />
      )}
      {home.data &&
        (isEmptyAccount(home.data) ? (
          <>
            <EmptyState {...Copy.empty} action={<SimulatorLink />} />
            {quiet}
          </>
        ) : (
          <Content home={home.data} quiet={quiet} />
        ))}
    </Screen>
  );
}

function Content({ home, quiet }: Readonly<{ home: HomeView; quiet: ReactNode }>) {
  return (
    <div className="grid gap-x-12 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
        <AttentionSection home={home} />
        <ToMarkSection home={home} />
        <FirstBookingMoment home={home} />
      </div>
      <div>
        <TodaySection home={home} />
        {quiet}
        <ResultsLink />
      </div>
    </div>
  );
}
