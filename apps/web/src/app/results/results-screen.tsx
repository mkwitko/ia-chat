import { useState } from 'react';
import { Route } from '@/routes';
import { cn } from '@/lib/utils';
import { OriginLabel } from '../customers/customers-labels';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen } from '../screens/screen';
import { CardList, Note, Section } from '../screens/section';
import { CountMetric, DurationMetric, RateMetric } from './metric';
import { Period, useResults, type ResultsView } from './results-api';
import { ResultsCopy as Copy } from './results-copy';
import { durationOf, rateOf } from './results-model';

const PERIODS = [Period.month, Period.lastMonth, Period.last90Days] as const;
const DATE = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Spec 10, "Resultados": counts first; rates only with enough sample, always with the formula. */
export function ResultsScreen() {
  const [period, setPeriod] = useState<Period>(Period.month);
  const results = useResults(period);
  return (
    <Screen title={Copy.title}>
      <BackLink to={Route.home} label={Copy.back} />
      <PeriodPicker value={period} onChange={setPeriod} />
      {results.isPending && <ListSkeleton />}
      {results.isError && (
        <LoadError message={Copy.loadFailed} onRetry={() => void results.refetch()} />
      )}
      {results.data && <Content results={results.data} />}
    </Screen>
  );
}

function PeriodPicker({
  value,
  onChange,
}: Readonly<{ value: Period; onChange: (period: Period) => void }>) {
  return (
    <fieldset className="flex gap-2 overflow-x-auto [scrollbar-width:none] px-4 py-2 md:px-0">
      <legend className="sr-only">{Copy.periodLabel}</legend>
      {PERIODS.map((period) => (
        <label
          key={period}
          className={cn(
            'flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
            value === period
              ? 'border-primary bg-brand-soft text-primary'
              : 'bg-card text-muted-foreground',
          )}
        >
          <input
            type="radio"
            name="results-period"
            className="sr-only"
            checked={value === period}
            onChange={() => {
              onChange(period);
            }}
          />
          {Copy.periods[period]}
        </label>
      ))}
    </fieldset>
  );
}

function Content({ results }: Readonly<{ results: ResultsView }>) {
  const since = results.dataSince ? DATE.format(new Date(results.dataSince)) : null;
  return (
    <div className="pb-10">
      <Note>{since ? Copy.baseline(since) : Copy.baselineNoDate}</Note>
      <Section title={Copy.conversations.title}>
        <CardList>
          <CountMetric {...Copy.conversations} count={results.conversations} />
          <CountMetric {...Copy.newContacts} count={results.newContacts} />
          <ResponseMetrics results={results} />
        </CardList>
      </Section>
      <Section title={Copy.booked.title}>
        <CardList>
          <AgendaMetrics results={results} />
        </CardList>
        <div className="pt-2">
          <Note>{Copy.requestsNote}</Note>
        </div>
      </Section>
      <OriginSection results={results} />
    </div>
  );
}

function ResponseMetrics({ results }: Readonly<{ results: ResultsView }>) {
  const { minSample, firstResponse, escalation } = results;
  return (
    <>
      <DurationMetric
        {...Copy.firstResponse}
        duration={durationOf(firstResponse.medianSeconds, firstResponse.sample, minSample)}
        sampleNote={Copy.firstResponse.sample}
      />
      <RateMetric
        {...Copy.escalation}
        rate={rateOf(escalation.handedOff, escalation.total, minSample)}
      />
    </>
  );
}

function AgendaMetrics({ results }: Readonly<{ results: ResultsView }>) {
  const { attended, noShow, unmarked } = results.attendance;
  return (
    <>
      <CountMetric {...Copy.booked} count={results.appointments.booked} />
      <CountMetric {...Copy.cancelled} count={results.appointments.cancelled} />
      <RateMetric
        {...Copy.noShow}
        rate={rateOf(noShow, attended + noShow, results.minSample)}
        detail={Copy.noShow.unmarked(unmarked)}
      />
      <CountMetric {...Copy.recovered} count={results.recovered} />
      <CountMetric {...Copy.repeatBookings} count={results.repeatBookings} />
    </>
  );
}

function OriginSection({ results }: Readonly<{ results: ResultsView }>) {
  return (
    <Section title={Copy.originTitle}>
      <Note>{Copy.originFormula}</Note>
      {results.byOrigin.length === 0 && <Note>{Copy.originEmpty}</Note>}
      <CardList>
        {results.byOrigin.map(({ origin, count }) => (
          <li key={origin} className="flex min-h-11 items-center justify-between px-4 py-2">
            <span>{OriginLabel[origin]}</span>
            <span className="font-semibold tabular-nums">{count}</span>
          </li>
        ))}
        <CountMetric {...Copy.referrals} count={results.referrals} />
      </CardList>
    </Section>
  );
}
