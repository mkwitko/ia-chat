import { Link } from 'react-router';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EmptyState } from '../screens/empty-state';
import { SimulatorLink } from '../simulator/simulator-link';
import { Screen } from '../screens/screen';
import { RecoveredCard } from '../results/recovered';
import { RecoveredCopy } from '../results/recovered-copy';
import { Note, Section } from '../screens/section';
import { AttentionSection, hasAttention } from './attention-section';
import { NotBookedSection, TodaySection } from './day-sections';
import { ChecklistCard } from './checklist-card';
import { NextStepCard } from './next-step';
import { useHome, type HomeView } from './home-api';
import { HomeCopy as Copy } from './home-copy';

const COUNT_TILES = [
  { key: 'contacts', label: Copy.counts.contacts, to: Route.customers },
  { key: 'booked', label: Copy.counts.booked, to: Route.agenda },
  { key: 'awaiting', label: Copy.counts.awaiting, to: Route.conversations },
  { key: 'cancelled', label: Copy.counts.cancelled, to: Route.agenda },
] as const;

// 2 × 2 on the phone, one row from lg: dividers between cells only.
const CELL_BORDER = [
  '',
  'border-l',
  'border-t lg:border-t-0 lg:border-l',
  'border-t border-l lg:border-t-0',
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
      <NextStepCard />
      <ChecklistCard />
      {home.isPending && <ListSkeleton />}
      {home.isError && <LoadError message={Copy.loadFailed} onRetry={() => void home.refetch()} />}
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
    <div className="grid gap-x-10 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="xl:col-span-2">
        <RecoveredCard title={RecoveredCopy.homeTitle} figure={home.recovered} />
        <MonthCounts month={home.month} />
      </div>
      <div>
        <AttentionSection home={home} />
        <TodaySection home={home} />
      </div>
      <div>
        <NotBookedSection home={home} />
        <Section title={Copy.resultsHeading}>
          <Note>{Copy.resultsBody}</Note>
          <Link
            to={Route.results}
            className="flex min-h-11 w-fit items-center px-4 text-sm font-semibold underline-offset-4 hover:underline md:px-0"
          >
            {Copy.seeResults}
          </Link>
        </Section>
      </div>
    </div>
  );
}

/** The month as one strip of four numbers, divided like a ledger row, each a link to its list. */
function MonthCounts({ month }: Readonly<{ month: HomeView['month'] }>) {
  return (
    <section aria-labelledby="month-heading">
      <h2 id="month-heading" className="px-4 pb-3 text-sm text-muted-foreground md:px-0">
        {Copy.monthHeading}
      </h2>
      <ul className="grid grid-cols-2 border-y bg-card md:rounded-xl md:border md:shadow-card lg:grid-cols-4">
        {COUNT_TILES.map((tile, index) => (
          <li key={tile.key} className={CELL_BORDER[index]}>
            <Link
              to={tile.to}
              className="grid gap-1 px-4 py-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:px-5 md:py-5"
            >
              <span className="text-2xl font-semibold tabular-nums">{month[tile.key]}</span>
              <span className="text-sm text-muted-foreground">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
