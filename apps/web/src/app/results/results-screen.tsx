import { useState } from 'react';
import { Route } from '@/routes';
import { OriginLabel } from '../customers/customers-labels';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { MoreOptions } from '../screens/editor-screen';
import { ChoicePills } from '../screens/choice-pills';
import { Screen } from '../screens/screen';
import { HelpArticle } from '../screens/screen-help';
import { CardList, Note, Section } from '../screens/section';
import { CountMetric, DurationMetric, MetricGrid, RateMetric } from './metric';
import { RecoveredCard, RecoveredWeeks } from './recovered';
import { RecoveredCopy } from './recovered-copy';
import { Period, useResults, type ResultsView } from './results-api';
import { ResultsCopy as Copy } from './results-copy';
import { durationOf, rateOf } from './results-model';
import { HowWeCount } from './results-how';

const PERIODS = [Period.month, Period.lastMonth, Period.last90Days] as const;
/** Spec 10, "Resultados": counts first; rates only with enough sample, always with the formula. */
export function ResultsScreen() {
  const [period, setPeriod] = useState<Period>(Period.month);
  const results = useResults(period);
  return (
    <Screen title={Copy.title} help={HelpArticle.results} hint={Copy.hint}>
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
    <ChoicePills
      name="results-period"
      legend={Copy.periodLabel}
      options={PERIODS.map((period) => ({ value: period, label: Copy.periods[period] }))}
      value={value}
      onChange={onChange}
    />
  );
}

function Content({ results }: Readonly<{ results: ResultsView }>) {
  return (
    <div className="pb-10">
      <RecoveredSection results={results} />
      <Section title={Copy.mainTitle}>
        <MetricGrid>
          <CountMetric {...Copy.conversations} count={results.conversations} />
          <CountMetric {...Copy.booked} count={results.appointments.booked} />
          <NoShowMetric results={results} />
          <ResponseMetrics results={results} />
        </MetricGrid>
      </Section>
      <div className="px-4 pt-8 md:px-0">
        <MoreOptions flush label={Copy.allNumbers}>
          <RecoveredWeeks
            weeks={results.recoveredMoney.weeks}
            withMoney={results.recoveredMoney.count >= results.minSample}
          />
          <MetricGrid>
            <CountMetric {...Copy.newContacts} count={results.newContacts} />
            <EscalationMetric results={results} />
            <AgendaMetrics results={results} />
          </MetricGrid>
          <OriginSection results={results} />
        </MoreOptions>
      </div>
      <div className="px-4 pt-4 md:px-0">
        <HowWeCount dataSince={results.dataSince} />
      </div>
    </div>
  );
}

function RecoveredSection({ results }: Readonly<{ results: ResultsView }>) {
  const { count, valueCents, afterHours } = results.recoveredMoney;
  const figure = { count, valueCents, afterHours, minSample: results.minSample };
  return (
    <div className="pt-4">
      <RecoveredCard title={RecoveredCopy.resultsTitle} figure={figure} />
    </div>
  );
}

function ResponseMetrics({ results }: Readonly<{ results: ResultsView }>) {
  const { minSample, firstResponse } = results;
  return (
    <DurationMetric
      {...Copy.firstResponse}
      duration={durationOf(firstResponse.medianSeconds, firstResponse.sample, minSample)}
      sampleNote={Copy.firstResponse.sample}
    />
  );
}

function NoShowMetric({ results }: Readonly<{ results: ResultsView }>) {
  const { attended, noShow, unmarked } = results.attendance;
  return (
    <RateMetric
      title={Copy.noShow.title}
      rate={rateOf(noShow, attended + noShow, results.minSample)}
      detail={Copy.noShow.counts(noShow, attended + noShow)}
      note={unmarked > 0 ? Copy.noShow.unmarked(unmarked) : undefined}
    />
  );
}

function EscalationMetric({ results }: Readonly<{ results: ResultsView }>) {
  const { handedOff, total } = results.escalation;
  return (
    <RateMetric
      title={Copy.escalation.title}
      rate={rateOf(handedOff, total, results.minSample)}
      detail={Copy.escalation.counts(handedOff, total)}
    />
  );
}

function AgendaMetrics({ results }: Readonly<{ results: ResultsView }>) {
  return (
    <>
      <CountMetric {...Copy.rescheduled} count={results.appointments.rescheduled} />
      <CountMetric {...Copy.cancelled} count={results.appointments.cancelled} />
      <CountMetric {...Copy.recovered} count={results.recovered} />
      <CountMetric {...Copy.repeatBookings} count={results.repeatBookings} />
    </>
  );
}

function OriginSection({ results }: Readonly<{ results: ResultsView }>) {
  return (
    <Section title={Copy.originTitle}>
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
