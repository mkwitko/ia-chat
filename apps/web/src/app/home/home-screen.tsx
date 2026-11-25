import { House } from 'lucide-react';
import { Link } from 'react-router';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EmptyState } from '../screens/empty-state';
import { Screen } from '../screens/screen';
import { Note, Section } from '../screens/section';
import { AttentionSection, hasAttention } from './attention-section';
import { NotBookedSection, TodaySection } from './day-sections';
import { useHome, type HomeView } from './home-api';
import { HomeCopy as Copy } from './home-copy';

const COUNT_TILES = [
  { key: 'contacts', label: Copy.counts.contacts, to: Route.customers },
  { key: 'booked', label: Copy.counts.booked, to: Route.agenda },
  { key: 'awaiting', label: Copy.counts.awaiting, to: Route.conversations },
  { key: 'cancelled', label: Copy.counts.cancelled, to: Route.agenda },
] as const;

const isEmptyAccount = (home: HomeView) =>
  home.month.contacts === 0 &&
  home.today.length === 0 &&
  home.notBooked.count === 0 &&
  !hasAttention(home);

/** Spec 10, "Início": the month in four numbers, what needs the owner, today and who did not book. */
export function HomeScreen() {
  const home = useHome();
  return (
    <Screen title={Copy.title}>
      {home.isPending && <ListSkeleton />}
      {home.isError && <LoadError message={Copy.loadFailed} onRetry={() => void home.refetch()} />}
      {home.data &&
        (isEmptyAccount(home.data) ? (
          <EmptyState icon={House} {...Copy.empty} />
        ) : (
          <Content home={home.data} />
        ))}
    </Screen>
  );
}

function Content({ home }: Readonly<{ home: HomeView }>) {
  return (
    <div className="pb-10">
      <MonthCounts month={home.month} />
      <AttentionSection home={home} />
      <TodaySection home={home} />
      <NotBookedSection home={home} />
      <Section title={Copy.resultsHeading}>
        <Note>{Copy.resultsBody}</Note>
        <Link
          to={Route.results}
          className="flex min-h-11 items-center px-4 text-sm font-semibold text-primary md:px-0"
        >
          {Copy.seeResults}
        </Link>
      </Section>
    </div>
  );
}

function MonthCounts({ month }: Readonly<{ month: HomeView['month'] }>) {
  return (
    <section aria-label={Copy.monthHeading}>
      <p className="px-4 pb-2 text-sm font-semibold text-muted-foreground md:px-0">
        {Copy.monthHeading}
      </p>
      <ul className="grid grid-cols-2 gap-2 px-4 md:grid-cols-4 md:px-0">
        {COUNT_TILES.map((tile) => (
          <li key={tile.key}>
            <Link
              to={tile.to}
              className="grid min-h-16 content-center gap-0.5 rounded-xl border bg-card px-3 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="text-2xl font-bold tabular-nums">{month[tile.key]}</span>
              <span className="text-sm text-muted-foreground">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
