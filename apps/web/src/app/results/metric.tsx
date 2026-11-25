import { ResultsCopy as Copy } from './results-copy';
import { Shown, type Duration, type Rate } from './results-model';

interface MetricProps {
  title: string;
  value: string;
  formula: string;
  detail?: string | undefined;
}

/** One number, its plain-language formula and, when needed, the counts behind it. */
export function Metric({ title, value, formula, detail }: Readonly<MetricProps>) {
  return (
    <li className="grid gap-1 px-4 py-3">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {detail && <p className="text-sm tabular-nums">{detail}</p>}
      <p className="text-xs text-muted-foreground">
        <span className="sr-only">{Copy.formulaLabel}: </span>
        {formula}
      </p>
    </li>
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
      detail={isOk ? undefined : sampleNote(duration.sample)}
    />
  );
}
