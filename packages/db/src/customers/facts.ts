import { Prisma } from '../../generated/prisma/client.ts';
import type { Tx } from '../index.ts';
import type { PipelineStage } from '../../generated/prisma/enums.ts';
import { deriveStage, type StageFacts } from './stage.ts';

/** Everything the customers list, Home and Results know about one contact, in one query. */
export interface ContactFacts {
  contactId: string;
  conversationId: string | null;
  lastInboundAt: Date | null;
  nextAppointmentAt: Date | null;
  facts: StageFacts;
}

interface Row {
  contactId: string;
  conversationId: string | null;
  createdAt: Date;
  overrideStage: PipelineStage | null;
  overrideAt: Date | null;
  lastMessageAt: Date | null;
  lastInboundAt: Date | null;
  live: number;
  attended: number;
  total: number;
  nextAt: Date | null;
  lastChangeAt: Date | null;
}

const newest = (...dates: (Date | null)[]): Date | null =>
  dates.reduce<Date | null>((best, date) => (date && (!best || date > best) ? date : best), null);

/**
 * Facts per contact (RLS limits it to the tenant). Dates are from `created_at`: the instant the
 * panel and the assistant saw the message. One lateral aggregate per source, no N+1.
 */
export async function loadFacts(tx: Tx, contactId?: string): Promise<ContactFacts[]> {
  const only = contactId ? Prisma.sql`where c.id = ${contactId}::uuid` : Prisma.empty;
  const rows = await tx.$queryRaw<Row[]>`
    select c.id as "contactId", c.created_at as "createdAt",
      c.stage_override as "overrideStage", c.stage_override_at as "overrideAt",
      (select v.id from conversations v where v.contact_id = c.id
        order by v.last_message_at desc nulls last limit 1) as "conversationId",
      m."lastMessageAt", m."lastInboundAt",
      coalesce(a.live, 0)::int as live, coalesce(a.attended, 0)::int as attended,
      coalesce(a.total, 0)::int as total, a."nextAt", a."lastChangeAt"
    from contacts c
    left join lateral (
      select max(msg.created_at) as "lastMessageAt",
        max(msg.created_at) filter (where msg.direction = 'inbound') as "lastInboundAt"
      from messages msg join conversations v on v.id = msg.conversation_id
      where v.contact_id = c.id) m on true
    left join lateral (
      select count(*) filter (where ap.status in ('scheduled', 'confirmed')) as live,
        count(*) filter (where ap.status = 'completed') as attended,
        count(*) as total,
        min(ap.starts_at) filter (where ap.status in ('scheduled', 'confirmed')
          and ap.starts_at > now()) as "nextAt",
        max(ap.updated_at) as "lastChangeAt"
      from appointments ap where ap.contact_id = c.id) a on true
    ${only}`;
  return rows.map(toFacts);
}

function toFacts(row: Row): ContactFacts {
  const override =
    row.overrideStage && row.overrideAt ? { stage: row.overrideStage, at: row.overrideAt } : null;
  return {
    contactId: row.contactId,
    conversationId: row.conversationId,
    lastInboundAt: row.lastInboundAt,
    nextAppointmentAt: row.nextAt,
    facts: {
      createdAt: row.createdAt,
      lastMessageAt: row.lastMessageAt,
      liveAppointments: row.live,
      attended: row.attended,
      appointmentsEver: row.total,
      latestFactAt: newest(row.lastInboundAt, row.lastChangeAt),
      override,
    },
  };
}

export const stageOf = (row: ContactFacts, now: Date): PipelineStage => deriveStage(row.facts, now);
