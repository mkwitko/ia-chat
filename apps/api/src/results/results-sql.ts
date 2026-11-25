import type { Tx } from '@app/db';
import type { Range } from '../period.ts';

// Aggregates the Results screen needs that Prisma cannot express. Row security limits every
// query to the tenant. Instants are `created_at` of the rows.

interface One {
  n: number;
}

/** Conversations with at least one patient message in the period. */
export async function activeConversations(tx: Tx, { start, end }: Range): Promise<number> {
  const [row] = await tx.$queryRaw<One[]>`
    select count(distinct m.conversation_id)::int as n from messages m
    where m.direction = 'inbound' and m.created_at >= ${start} and m.created_at < ${end}`;
  return row?.n ?? 0;
}

/** Of those, the ones someone took over (the control went to the professional) in the period. */
export async function handedOffConversations(tx: Tx, { start, end }: Range): Promise<number> {
  const [row] = await tx.$queryRaw<One[]>`
    select count(distinct a.entity_id)::int as n from audit_log a
    where a.entity = 'conversation' and a.action = 'conversation.control_changed'
      and a.after ->> 'control' = 'human' and a.created_at >= ${start} and a.created_at < ${end}
      and exists (select 1 from messages m where m.conversation_id::text = a.entity_id
        and m.direction = 'inbound' and m.created_at >= ${start} and m.created_at < ${end})`;
  return row?.n ?? 0;
}

export interface ResponseTime {
  sample: number;
  medianSeconds: number | null;
}

/**
 * Conversations opened in the period (first patient message inside it) that got an answer from
 * the assistant or the professional: seconds from that message to the first answer.
 */
export async function firstResponse(tx: Tx, { start, end }: Range): Promise<ResponseTime> {
  const [row] = await tx.$queryRaw<{ sample: number; median: number | null }[]>`
    select count(*)::int as sample,
      percentile_cont(0.5) within group (order by x.secs) as median
    from (
      select extract(epoch from (r.at - f.at)) as secs
      from (
        select m.conversation_id as id, min(m.created_at) as at from messages m
        where m.direction = 'inbound' group by m.conversation_id
        having min(m.created_at) >= ${start} and min(m.created_at) < ${end}) f
      join lateral (
        select min(o.created_at) as at from messages o
        where o.conversation_id = f.id and o.direction = 'outbound'
          and o.author in ('ai', 'human') and o.created_at > f.at) r on r.at is not null) x`;
  return { sample: row?.sample ?? 0, medianSeconds: row?.median ?? null };
}

/**
 * Contacts that were "não agendou" and then booked in the period: a booking entry in the history
 * preceded by a "não agendou" entry with no booking in between.
 */
export async function recoveredContacts(tx: Tx, { start, end }: Range): Promise<number> {
  const [row] = await tx.$queryRaw<One[]>`
    select count(distinct b.contact_id)::int as n from contact_stage_events b
    where b.to_stage = 'booked' and b.created_at >= ${start} and b.created_at < ${end}
      and exists (select 1 from contact_stage_events n
        where n.contact_id = b.contact_id and n.to_stage = 'not_booked' and n.created_at < b.created_at
          and not exists (select 1 from contact_stage_events x
            where x.contact_id = b.contact_id and x.to_stage in ('booked', 'attended')
              and x.created_at > n.created_at and x.created_at < b.created_at))`;
  return row?.n ?? 0;
}

/** Appointments created in the period for a contact who had already been attended before. */
export async function repeatBookings(tx: Tx, { start, end }: Range): Promise<number> {
  const [row] = await tx.$queryRaw<One[]>`
    select count(*)::int as n from appointments a
    where a.created_at >= ${start} and a.created_at < ${end} and a.status <> 'cancelled'
      and exists (select 1 from appointments p where p.contact_id = a.contact_id
        and p.status = 'completed' and p.starts_at < a.created_at)`;
  return row?.n ?? 0;
}
