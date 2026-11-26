import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { formatCents } from '@/lib/money';
import { CardList, Note, Section } from '../screens/section';
import { RecoveredCopy as Copy } from './recovered-copy';
import { moneyOf, Shown } from './results-model';

export interface RecoveredFigure {
  count: number;
  valueCents: number;
  afterHours: number;
  minSample: number;
}

/**
 * "Dinheiro recuperado": the sum with the count behind it, or "Ainda sem dados" in plain text
 * below the sample. The formula is one tap away ("Como calculamos").
 */
export function RecoveredCard({
  title,
  figure,
}: Readonly<{ title: string; figure: RecoveredFigure }>) {
  const headingId = useId();
  const money = moneyOf(figure.count, figure.valueCents, figure.minSample);
  const isOk = money.kind === Shown.ok;
  return (
    <section aria-labelledby={headingId} className="pb-6">
      <div className="grid gap-1 border-y bg-card px-4 py-4 md:rounded-xl md:border md:px-5 md:py-5 md:shadow-card">
        <h2 id={headingId} className="text-sm text-muted-foreground">
          {title}
        </h2>
        <p
          className={
            isOk
              ? 'text-2xl font-semibold tabular-nums'
              : 'py-1 text-base font-medium text-muted-foreground'
          }
        >
          {isOk ? formatCents(money.cents) : Copy.noData}
        </p>
        <p className="text-sm">
          {isOk ? Copy.basis(figure.count) : Copy.missing(figure.count, figure.minSample)}
          {isOk && figure.afterHours > 0 && ` ${Copy.afterHours(figure.afterHours)}`}
        </p>
        <HowWeCount />
      </div>
    </section>
  );
}

function HowWeCount() {
  return (
    <details className="group mt-1 text-sm">
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        {Copy.howTitle}
        <ChevronDown
          className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="grid max-w-prose gap-2 pb-1 text-muted-foreground">
        <p>{Copy.how}</p>
        <p>{Copy.howAfterHours}</p>
      </div>
    </details>
  );
}

export interface RecoveredWeek {
  week: string;
  count: number;
  valueCents: number;
}

/**
 * Resultados: the same figure week by week (local Monday). The sums show only when the period
 * total does (`withMoney`); below the sample, the counts alone.
 */
export function RecoveredWeeks({
  weeks,
  withMoney,
}: Readonly<{ weeks: RecoveredWeek[]; withMoney: boolean }>) {
  return (
    <Section title={Copy.weeksTitle}>
      {weeks.length === 0 ? (
        <Note>{Copy.weeksEmpty}</Note>
      ) : (
        <CardList>
          {weeks.map((row) => (
            <li
              key={row.week}
              className="flex min-h-11 items-center justify-between gap-4 px-4 py-2"
            >
              <span>{Copy.week(row.week)}</span>
              <span className="text-right tabular-nums">
                <span className={withMoney ? 'text-muted-foreground' : 'font-semibold'}>
                  {Copy.weekCount(row.count)}
                </span>
                {withMoney && (
                  <span className="font-semibold"> · {formatCents(row.valueCents)}</span>
                )}
              </span>
            </li>
          ))}
        </CardList>
      )}
    </Section>
  );
}
