import { randomUUID } from 'node:crypto';
import { MS_PER_DAY } from '@app/core';
import {
  ConsentActor,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  ConversationControl,
  ScheduledMessageKind,
  createDb,
  recordConsent,
} from '@app/db';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotifyReason } from '../notify/reasons.ts';
import { sweepLeadFollowUps } from './lead-follow-up.ts';

// M-10 with the database and a fake channel: one approved message to a lead that went quiet.
// Only free text inside the 24 h window; opt-out, human control and a closed window skip it.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-03-10T12:00:00Z');
const DAYS_QUIET = 3;
const APPROVED = 'Texto aprovado pelo dono (fictício).';
const OTHER_LEADS = 12;

let tenantId = '';
let sent: { conversationId: string; text: string }[] = [];
const notify = vi.fn(() => Promise.resolve());
const alert = vi.fn();
const channel = {
  send: (_tx: unknown, { conversationId, text }: { conversationId: string; text: string }) => {
    sent.push({ conversationId, text });
    return Promise.resolve({ providerMessageId: `fake.${randomUUID()}` });
  },
};

const daysAgo = (days: number) => new Date(NOW.getTime() - days * MS_PER_DAY);
const inTenant = <T>(work: Parameters<typeof db.withTenant<T>>[1]) => db.withTenant(tenantId, work);
const sweep = () =>
  sweepLeadFollowUps({ db, channel, notify, alert, now: NOW, onlyTenantId: tenantId });
const enable = (data: object = {}) =>
  db.client.tenant.update({
    where: { id: tenantId },
    data: { leadFollowUp: true, leadFollowUpText: APPROVED, ...data },
  });

async function lead(data: { quietDays?: number; conversation?: object } = {}) {
  const { quietDays = DAYS_QUIET, conversation = {} } = data;
  return inTenant(async (tx) => {
    const channelRow =
      (await tx.channel.findFirst()) ??
      (await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } }));
    const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
    const created = await tx.conversation.create({
      data: {
        tenantId,
        channelId: channelRow.id,
        contactId: contact.id,
        lastMessageAt: daysAgo(quietDays),
        windowExpiresAt: new Date(NOW.getTime() + MS_PER_DAY),
        ...conversation,
      },
    });
    return { contactId: contact.id, conversationId: created.id };
  });
}

beforeEach(async () => {
  sent = [];
  notify.mockClear();
  const tenant = await db.client.tenant.create({
    data: { name: 'Retorno (fictício)', slug: `ret-${randomUUID()}` },
  });
  tenantId = tenant.id;
});

describe('lead follow-up', () => {
  it('is off by default and never sends without an approved text', async () => {
    await lead();
    await sweep();
    await enable({ leadFollowUpText: null });
    await sweep();
    expect(sent).toEqual([]);
  });

  it('sends the approved text once to a lead quiet for the wait', async () => {
    const quiet = await lead();
    await enable();
    await sweep();
    await sweep();
    expect(sent).toEqual([{ conversationId: quiet.conversationId, text: APPROVED }]);
    const ledger = await inTenant((tx) =>
      tx.scheduledMessage.findMany({ where: { kind: ScheduledMessageKind.lead_follow_up } }),
    );
    expect(ledger).toHaveLength(1);
  });

  it('respects the wait set by the owner', async () => {
    await lead({ quietDays: 1 });
    await enable();
    await sweep();
    expect(sent).toEqual([]);
    await enable({ leadFollowUpDays: 1 });
    await sweep();
    expect(sent).toHaveLength(1);
  });

  it('leaves alone a booked client, a lead awaiting our answer and an old cold one', async () => {
    const booked = await lead();
    await book(booked.contactId);
    await lead({ conversation: { pendingSince: daysAgo(DAYS_QUIET) } });
    await lead({ quietDays: 60 });
    await enable();
    await sweep();
    expect(sent).toEqual([]);
  });

  it('an opted-out lead is never messaged', async () => {
    const quiet = await lead();
    await inTenant((tx) =>
      recordConsent(tx, {
        tenantId,
        contactId: quiet.contactId,
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
    expect(notify).not.toHaveBeenCalled();
  });

  it('human control and a closed window send nothing and tell the professional once', async () => {
    const human = await lead({ conversation: { control: ConversationControl.human } });
    const closed = await lead({ conversation: { windowExpiresAt: null } });
    await enable();
    await sweep();
    await sweep();
    expect(sent).toEqual([]);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith({
      tenantId,
      conversationId: human.conversationId,
      reason: NotifyReason.leadFollowUp,
    });
    expect(notify).toHaveBeenCalledWith({
      tenantId,
      conversationId: closed.conversationId,
      reason: NotifyReason.leadFollowUp,
    });
  });

  it('never sends in bulk: a run is capped', async () => {
    for (let index = 0; index < OTHER_LEADS; index += 1) await lead();
    await enable();
    await sweep();
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.length).toBeLessThan(OTHER_LEADS);
  });
});

function book(contactId: string) {
  return inTenant(async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const startsAt = daysAgo(-1);
    return tx.appointment.create({
      data: {
        tenantId,
        contactId,
        professionalId: professional.id,
        serviceId: service.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3_600_000),
      },
    });
  });
}
