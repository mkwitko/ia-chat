import type { ReactNode } from 'react';
import { ResultsCopy as Copy } from './results-copy';
import { Shown, type Duration, type Rate } from './results-model';

interface MetricProps {
  title: string;
  value: string;
  /** One plain sentence with the counts behind the number. */
  detail?: string | undefined;
  /** A second sentence, quieter (what is still left to mark). */
  note?: string | undefined;
  /** Not enough data yet: said in words, never in the big-number style. */
  missing?: boolean;
}

/** One number and, when needed, the plain counts behind it; the formula lives in "Como calculamos". */
export function Metric({ title, value, detail, note, missing }: Readonly<MetricProps>) {
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
      {detail && <p className="text-sm">{detail}</p>}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </li>
  );
}

/** Hairline grid of metrics: one column on the phone, two from sm. */
export function MetricGrid({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ul className="grid overflow-hidden border-y bg-card sm:grid-cols-2 md:rounded-xl md:border md:shadow-card">
      {children}
    </ul>
  );
}

export const CountMetric = ({ title, count }: Readonly<{ title: string; count: number }>) => (
  <Metric title={title} value={String(count)} />
);

interface RateProps {
  title: string;
  rate: Rate;
  detail: string;
  note?: string | undefined;
}

export function RateMetric({ title, rate, detail, note }: Readonly<RateProps>) {
  const isOk = rate.kind === Shown.ok;
  return (
    <Metric
      title={title}
      value={isOk ? `${String(rate.percent)}%` : Copy.insufficient}
      missing={!isOk}
      detail={detail}
      note={note}
    />
  );
}

interface DurationProps {
  title: string;
  duration: Duration;
  sampleNote: (count: number) => string;
}

export function DurationMetric({ title, duration, sampleNote }: Readonly<DurationProps>) {
  const isOk = duration.kind === Shown.ok;
  return (
    <Metric
      title={title}
      value={isOk ? duration.label : Copy.insufficient}
      missing={!isOk}
      detail={isOk ? undefined : sampleNote(duration.sample)}
    />
  );
}
