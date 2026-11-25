import type { ReactNode } from 'react';
import { ResultsCopy as Copy } from './results-copy';
import { Shown, type Duration, type Rate } from './results-model';

interface MetricProps {
  title: string;
  value: string;
  formula: string;
  detail?: string | undefined;
  /** Not enough data yet: said in words, never in the big-number style. */
  missing?: boolean;
}

/** One number, its plain-language formula and, when needed, the counts behind it. */
export function Metric({ title, value, formula, detail, missing }: Readonly<MetricProps>) {
  return (
    <li className="grid content-start gap-1 bg-card px-4 py-4 shadow-[1px_1px_0_0_var(--line)] md:px-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p
        className={
          missing
            ? 'py-1 text-base font-medium text-muted-foreground'
            : 'text-xl font-semibold tabular-nums'
        }
      >
        {value}
      </p>
      {detail && <p className="text-sm tabular-nums">{detail}</p>}
      <p className="text-xs text-muted-foreground">
        <span className="sr-only">{Copy.formulaLabel}: </span>
        {formula}
      </p>
    </li>
  );
}

/** Hairline grid of metrics: one column on the phone, up to three on the computer. */
export function MetricGrid({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ul className="grid overflow-hidden border-y bg-card sm:grid-cols-2 md:rounded-xl md:border md:shadow-card xl:grid-cols-3">
      {children}
    </ul>
  );
}

export const CountMetric = ({
  title,
  formula,
  count,
}: Readonly<{ title: string; formula: string; count: number }>) => (
  <Metric title={title} formula={formula} value={String(count)} />
);

export function RateMetric({
  title,
  formula,
  rate,
  detail,
}: Readonly<{ title: string; formula: string; rate: Rate; detail?: string }>) {
  const counts = Copy.insufficientCounts(rate.part, rate.total);
  const isOk = rate.kind === Shown.ok;
  return (
    <Metric
      title={title}
      formula={formula}
      value={isOk ? `${String(rate.percent)}%` : Copy.insufficient}
      missing={!isOk}
      detail={[counts, detail].filter(Boolean).join(' · ')}
    />
  );
}

export function DurationMetric({
  title,
  formula,
  duration,
  sampleNote,
}: Readonly<{
  title: string;
  formula: string;
  duration: Duration;
  sampleNote: (count: number) => string;
}>) {
  const isOk = duration.kind === Shown.ok;
  return (
    <Metric
      title={title}
      formula={formula}
      value={isOk ? duration.label : Copy.insufficient}
      missing={!isOk}
      detail={isOk ? undefined : sampleNote(duration.sample)}
    />
  );
}
