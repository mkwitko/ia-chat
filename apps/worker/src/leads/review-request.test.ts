import { randomUUID } from 'node:crypto';
import { MS_PER_DAY, REVIEW_MIN_GAP_DAYS } from '@app/core';
import {
  AppointmentStatus,
  ConsentActor,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  ConversationControl,
  ScheduledMessageKind,
  ScheduledMessageState,
  createDb,
  recordConsent,
} from '@app/db';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotifyReason } from '../notify/reasons.ts';
import { sweepReviewRequests } from './review-request.ts';

// M-12 with the database and a fake channel: one review request, hours after "Compareceu".

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-03-10T12:00:00Z');
const HOUR_MS = 3_600_000;
const LINK = 'https://g.page/r/exemplo-ficticio/review';

let tenantId = '';
let visits = 0;
let sent: { conversationId: string; text: string }[] = [];
const notify = vi.fn(() => Promise.resolve());
const alert = vi.fn();
const channel = {
  send: (_tx: unknown, { conversationId, text }: { conversationId: string; text: string }) => {
    sent.push({ conversationId, text });
    return Promise.resolve({ providerMessageId: `fake.${randomUUID()}` });
  },
};

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * HOUR_MS);
const inTenant = <T>(work: Parameters<typeof db.withTenant<T>>[1]) => db.withTenant(tenantId, work);
const sweep = () =>
  sweepReviewRequests({ db, channel, notify, alert, now: NOW, onlyTenantId: tenantId });
const enable = (data: object = {}) =>
  db.client.tenant.update({
    where: { id: tenantId },
    data: { reviewRequest: true, businessProfile: { reviewLink: LINK }, ...data },
  });

interface Visit {
  attendedHoursAgo?: number;
  conversation?: object;
  contactId?: string;
  status?: AppointmentStatus;
}

/** A visit marked at `attendedHoursAgo` (updatedAt), by a client with an open conversation. */
async function visit({ attendedHoursAgo = 4, conversation = {}, ...rest }: Visit = {}) {
  return inTenant(async (tx) => {
    const professional =
      (await tx.professional.findFirst()) ??
      (await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } }));
    const service =
      (await tx.service.findFirst()) ??
      (await tx.service.create({
        data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
      }));
    const channelRow =
      (await tx.channel.findFirst()) ??
      (await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } }));
    const contactId =
      rest.contactId ??
      (await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } })).id;
    const existing = await tx.conversation.findFirst({ where: { contactId } });
    const created =
      existing ??
      (await tx.conversation.create({
        data: {
          tenantId,
          channelId: channelRow.id,
          contactId,
          windowExpiresAt: new Date(NOW.getTime() + HOUR_MS),
          ...conversation,
        },
      }));
    visits += 1;
    const startsAt = hoursAgo(attendedHoursAgo + 1 + visits * 2); // never overlaps another visit
    const appointment = await tx.appointment.create({
      data: {
        tenantId,
        contactId,
        professionalId: professional.id,
        serviceId: service.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR_MS),
        status: rest.status ?? AppointmentStatus.completed,
        updatedAt: hoursAgo(attendedHoursAgo),
      },
    });
    return { contactId, conversationId: created.id, appointmentId: appointment.id };
  });
}

beforeEach(async () => {
  sent = [];
  visits = 0;
  notify.mockClear();
  const tenant = await db.client.tenant.create({
    data: { name: 'Avaliação (fictício)', slug: `ava-${randomUUID()}` },
  });
  tenantId = tenant.id;
});

describe('review request', () => {
  it('is off by default and needs the review link', async () => {
    await visit();
    await sweep();
    await enable({ businessProfile: {} });
    await sweep();
    expect(sent).toEqual([]);
  });

  it('asks once, after the delay, with the link and no health content', async () => {
    const attended = await visit();
    await enable();
    await sweep();
    await sweep();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.conversationId).toBe(attended.conversationId);
    expect(sent[0]?.text).toContain(LINK);
    const ledger = await inTenant((tx) =>
      tx.scheduledMessage.findMany({ where: { kind: ScheduledMessageKind.review_request } }),
    );
    expect(ledger.map((row) => row.appointmentId)).toEqual([attended.appointmentId]);
  });

  it('waits for the delay, skips other statuses and an old attendance', async () => {
    await visit({ attendedHoursAgo: 1 });
    await visit({ status: AppointmentStatus.no_show });
    await visit({ attendedHoursAgo: 24 * 30 });
    await enable();
    await sweep();
    expect(sent).toEqual([]);
    await enable({ reviewRequestDelayHours: 1 });
    await sweep();
    expect(sent).toHaveLength(1);
  });

  it('at most once per client in 90 days', async () => {
    const first = await visit();
    await enable();
    await sweep();
    await visit({ contactId: first.contactId });
    await sweep();
    expect(sent).toHaveLength(1);
    await inTenant((tx) =>
      tx.scheduledMessage.updateMany({
        where: { kind: ScheduledMessageKind.review_request },
        data: { sendAt: new Date(NOW.getTime() - (REVIEW_MIN_GAP_DAYS + 1) * MS_PER_DAY) },
      }),
    );
    await visit({ contactId: first.contactId });
    await sweep();
    expect(sent).toHaveLength(2);
  });

  it('an opted-out client is never asked', async () => {
    const attended = await visit();
    await inTenant((tx) =>
      recordConsent(tx, {
        tenantId,
        contactId: attended.contactId,
        kind: ConsentKind.opt_out,
        category: ConsentCategory.all,
        source: ConsentSource.patient_message,
        actor: { type: ConsentActor.contact },
        now: NOW,
      }),
    );
    await enable();
    await sweep();
    expect(sent).toEqual([]);
  });

  it('human control and a closed window send nothing and tell the professional once', async () => {
    const human = await visit({ conversation: { control: ConversationControl.human } });
    await visit({ conversation: { windowExpiresAt: null } });
    await enable();
    await sweep();
    await sweep();
    expect(sent).toEqual([]);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith({
      tenantId,
      conversationId: human.conversationId,
      reason: NotifyReason.reviewRequest,
    });
    const states = await inTenant((tx) =>
      tx.scheduledMessage.findMany({ where: { kind: ScheduledMessageKind.review_request } }),
    );
    expect(states.every((row) => row.state === ScheduledMessageState.cancelled)).toBe(true);
  });
});
