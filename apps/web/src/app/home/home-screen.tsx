import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EmptyState } from '../screens/empty-state';
import { HelpArticle } from '../screens/screen-help';
import { Screen } from '../screens/screen';
import { SimulatorLink } from '../simulator/simulator-link';
import { AttentionSection, EndingSection, hasAttention, ToMarkSection } from './attention-section';
import { MonthSummary, QuickActions, TodaySection } from './day-sections';
import { useHome, type HomeView } from './home-api';
import { HomeCopy as Copy } from './home-copy';
import { StatusCard } from './status-card';

const isEmptyAccount = (home: HomeView) =>
  home.month.contacts === 0 && home.today.length === 0 && !hasAttention(home);

/** Spec 10, "Início": one status card, then what needs the owner, today, and the month. */
export function HomeScreen() {
  const home = useHome();
  return (
    <Screen title={Copy.title} help={HelpArticle.home} hint={Copy.hint}>
      <StatusCard />
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
          <EmptyState {...Copy.empty} action={<SimulatorLink />} />
        ) : (
          <Content home={home.data} />
        ))}
    </Screen>
  );
}

function Content({ home }: Readonly<{ home: HomeView }>) {
  return (
    <div className="grid gap-x-12 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
        {/* Phone and tablet: the shortcuts right under the status card. */}
        <QuickActions className="xl:hidden" />
        <AttentionSection home={home} />
        <TodaySection home={home} />
        <ToMarkSection home={home} />
        <EndingSection home={home} />
      </div>
      <div>
        <QuickActions className="hidden pt-6 xl:grid" />
        <MonthSummary home={home} />
      </div>
    </div>
  );
}
