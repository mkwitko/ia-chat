import type { Tx } from '../index.ts';

// Research 09 #1, "dinheiro recuperado": appointments the assistant booked (`created_by = ai`)
// that the owner marked "compareceu" (`completed`), held in the period, valued at the service
// price. "Fora do horário": of those, booked at an instant outside every opening-hours rule
// (tenant's local time); with no rule set it is 0, never a guess. Row security limits the tenant.

/** Below this many cases a rate, median or money figure is not shown ("ainda sem dados"). */
export const MIN_SAMPLE = 5;

export interface Range {
  start: Date;
  end: Date;
}

export interface RecoveredWeek {
  /** Local Monday of the week, `YYYY-MM-DD`. */
  week: string;
  count: number;
  valueCents: number;
}

export interface RecoveredMoney {
  count: number;
  valueCents: number;
  afterHours: number;
  weeks: RecoveredWeek[];
}

interface Totals {
  count: number;
  cents: number;
  after_hours: number;
}

interface WeekRow {
  week: string;
  count: number;
  cents: number;
}

export async function recoveredMoney(
  tx: Tx,
  { range, timezone }: { range: Range; timezone: string },
): Promise<RecoveredMoney> {
  const { start, end } = range;
  const [totals] = await tx.$queryRaw<Totals[]>`
    select count(*)::int as count, coalesce(sum(s.price_cents), 0)::int as cents,
      (count(*) filter (where exists (select 1 from availability_rules)
        and not exists (select 1 from availability_rules r
          where r.weekday = extract(dow from a.created_at at time zone ${timezone})::int
            and (a.created_at at time zone ${timezone})::time >= r.start_time
            and (a.created_at at time zone ${timezone})::time < r.end_time)))::int as after_hours
    from appointments a join services s on s.id = a.service_id
    where a.created_by = 'ai' and a.status = 'completed'
      and a.starts_at >= ${start} and a.starts_at < ${end}`;
  const weeks = await tx.$queryRaw<WeekRow[]>`
    select to_char(date_trunc('week', a.starts_at at time zone ${timezone}), 'YYYY-MM-DD') as week,
      count(*)::int as count, coalesce(sum(s.price_cents), 0)::int as cents
    from appointments a join services s on s.id = a.service_id
    where a.created_by = 'ai' and a.status = 'completed'
      and a.starts_at >= ${start} and a.starts_at < ${end}
    group by 1 order by 1`;
  return {
    count: totals?.count ?? 0,
    valueCents: totals?.cents ?? 0,
    afterHours: totals?.after_hours ?? 0,
    weeks: weeks.map((row) => ({ week: row.week, count: row.count, valueCents: row.cents })),
  };
}
