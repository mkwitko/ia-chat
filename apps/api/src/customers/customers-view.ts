import { loadFacts, stageOf, type ContactFacts, type PipelineStage, type Tx } from '@app/db';

// Spec 10, "Clientes": name, phone, origin, administrative history and one simple status.
// No message text and no free-text field: nothing clinical is read or shown here.

type ConsentEvent = Awaited<ReturnType<Tx['consentEvent']['findFirstOrThrow']>>;
type ContactStageEvent = Awaited<ReturnType<Tx['contactStageEvent']['findFirstOrThrow']>>;

const LIST_LIMIT = 300; // ponytail: one practice has hundreds of contacts; paginate past that
const HISTORY_LIMIT = 50;

export interface CustomerSummary {
  id: string;
  name: string | null;
  phone: string | null;
  origin: string;
  originRef: string | null;
  stage: PipelineStage;
  lostReason: string | null;
  optedOut: boolean;
  lastContactAt: Date | null;
  nextAppointmentAt: Date | null;
  conversationId: string | null;
  /** Recurrence is a count, not a stage. */
  attendedCount: number;
}

export interface CustomerQuery {
  q: string;
  stage?: PipelineStage | undefined;
  now: Date;
}

const summaryOf = (
  contact: {
    id: string;
    name: string | null;
    phoneE164: string | null;
    origin: string;
    originRef: string | null;
    lostReason: string | null;
    optOutAt: Date | null;
  },
  row: ContactFacts,
  now: Date,
): CustomerSummary => ({
  id: contact.id,
  name: contact.name,
  phone: contact.phoneE164,
  origin: contact.origin,
  originRef: contact.originRef,
  stage: stageOf(row, now),
  lostReason: contact.lostReason,
  optedOut: contact.optOutAt !== null,
  lastContactAt: row.facts.lastMessageAt,
  nextAppointmentAt: row.nextAppointmentAt,
  conversationId: row.conversationId,
  attendedCount: row.facts.attended,
});

export async function listCustomers(tx: Tx, query: CustomerQuery): Promise<CustomerSummary[]> {
  const contacts = await tx.contact.findMany({
    where: query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { phoneE164: { contains: query.q } },
          ],
        }
      : {},
  });
  const facts = new Map((await loadFacts(tx)).map((row) => [row.contactId, row]));
  const items = contacts.flatMap((contact) => {
    const row = facts.get(contact.id);
    return row ? [summaryOf(contact, row, query.now)] : [];
  });
  const wanted = query.stage ? items.filter((item) => item.stage === query.stage) : items;
  return wanted.toSorted(byLastContact).slice(0, LIST_LIMIT);
}

const time = (date: Date | null) => date?.getTime() ?? 0;
const byLastContact = (a: CustomerSummary, b: CustomerSummary) =>
  time(b.lastContactAt) - time(a.lastContactAt);

async function history(tx: Tx, id: string) {
  const [appointments, consent, stages, conversations] = await Promise.all([
    tx.appointment.findMany({
      where: { contactId: id },
      include: { service: { select: { name: true } } },
      orderBy: { startsAt: 'desc' },
      take: HISTORY_LIMIT,
    }),
    tx.consentEvent.findMany({ where: { contactId: id }, orderBy: { createdAt: 'desc' } }),
    tx.contactStageEvent.findMany({
      where: { contactId: id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    }),
    tx.conversation.count({ where: { contactId: id } }),
  ]);
  return {
    conversations,
    appointments: appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt,
      status: a.status,
      serviceName: a.service.name,
    })),
    consent: consent.map(consentView),
    stages: stages.map(stageView),
  };
}

const consentView = (e: ConsentEvent) => ({
  id: e.id,
  kind: e.kind,
  category: e.category,
  source: e.source,
  actorType: e.actorType,
  at: e.createdAt,
});

const stageView = (e: ContactStageEvent) => ({
  id: e.id,
  from: e.fromStage,
  to: e.toStage,
  source: e.source,
  lostReason: e.lostReason,
  at: e.createdAt,
});

export async function readCustomer(tx: Tx, id: string, now: Date) {
  const contact = await tx.contact.findUnique({ where: { id } });
  const [row] = contact ? await loadFacts(tx, id) : [];
  if (!contact || !row) return null;
  return {
    ...summaryOf(contact, row, now),
    createdAt: contact.createdAt,
    ...(await history(tx, id)),
  };
}
