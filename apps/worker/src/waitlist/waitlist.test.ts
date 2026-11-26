import { randomUUID } from 'node:crypto';
import {
  AppointmentStatus,
  ConsentActor,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  ConversationControl,
  OFFER_TTL_MINUTES,
  SlotOfferState,
  WaitlistStatus,
  createDb,
  recordConsent,
  wasOfferedBefore,
} from '@app/db';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotifyReason } from '../notify/reasons.ts';
import { sweepWaitlist } from './offer-sweep.ts';
import { sweepNoShows } from './no-show.ts';

// M-09 with the database and a fake channel: the freed slot goes to the first entry that can
// be reached; opt-out, human control and a closed window skip it (the professional is told).

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

// Fri 2027-01-01 09:00 in Sao Paulo; Mondays 09:00-12:00 are open.
const NOW = new Date('2027-01-01T12:00:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const AFTER_TTL = new Date(NOW.getTime() + (OFFER_TTL_MINUTES + 1) * 60_000);
const OPEN_UNTIL = new Date('2027-01-02T12:00:00Z');
const HOUR_MS = 3_600_000;
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

interface Person {
  contactId: string;
  conversationId: string;
}

let tenantId = '';
let ids = { professionalId: '', serviceId: '' };
let people: Person[] = [];
let sent: { conversationId: string; text: string }[] = [];
const notify = vi.fn(() => Promise.resolve());
const alert = vi.fn();
const channel = {
  send: (_tx: unknown, { conversationId, text }: { conversationId: string; text: string }) => {
    sent.push({ conversationId, text });
    return Promise.resolve({ providerMessageId: `fake.${randomUUID()}` });
  },
};

beforeEach(async () => {
  sent = [];
  notify.mockClear();
  const tenant = await db.client.tenant.create({
    data: { name: 'Espera (fictício)', slug: `esp-${randomUUID()}` },
  });
  tenantId = tenant.id;
  ({ ids, people } = await db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    await tx.availabilityRule.create({
      data: {
        tenantId,
        professionalId: professional.id,
        weekday: 1,
        startTime: at('09:00'),
        endTime: at('12:00'),
      },
    });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const channelRow = await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } });
    const made: Person[] = [];
    for (let index = 0; index < 3; index += 1) {
      const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
      const conversation = await tx.conversation.create({
        data: {
          tenantId,
          channelId: channelRow.id,
          contactId: contact.id,
          windowExpiresAt: OPEN_UNTIL,
        },
      });
      made.push({ contactId: contact.id, conversationId: conversation.id });
    }
    return { ids: { professionalId: professional.id, serviceId: service.id }, people: made };
  }));
});

const person = (index: number): Person => people[index] ?? { contactId: '', conversationId: '' };
const inTenant = <T>(work: Parameters<typeof db.withTenant<T>>[1]) => db.withTenant(tenantId, work);

function appointment(index: number, status: AppointmentStatus, startsAt = MONDAY_9) {
  return inTenant((tx) =>
    tx.appointment.create({
      data: {
        tenantId,
        ...ids,
        contactId: person(index).contactId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR_MS),
        status,
      },
    }),
  );
}
const waitFor = (index: number) =>
  inTenant((tx) =>
    tx.slotWaitlistEntry.create({
      data: {
        tenantId,
        contactId: person(index).contactId,
        serviceId: ids.serviceId,
        windowStart: NOW,
        windowEnd: new Date(MONDAY_9.getTime() + 24 * HOUR_MS),
      },
    }),
  );
const setConversation = (index: number, data: object) =>
  inTenant((tx) => tx.conversation.update({ where: { id: person(index).conversationId }, data }));
const offers = () =>
  inTenant((tx) =>
    tx.slotOffer.findMany({ orderBy: { createdAt: 'asc' }, include: { entry: true } }),
  );
const sweep = (now = NOW) =>
  sweepWaitlist({ db, channel, notify, alert, now, onlyTenantId: tenantId });

describe('waitlist sweep', () => {
  beforeEach(async () => {
    await appointment(0, AppointmentStatus.cancelled);
    await waitFor(1);
    await waitFor(2);
  });

  it('offers the freed slot to the first entry, inside the window, and records the offer', async () => {
    await sweep();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.conversationId).toBe(person(1).conversationId);
    expect(sent[0]?.text).toContain('Sessão em 04/01/2027 às 09:00');
    const offered = await inTenant((tx) =>
      wasOfferedBefore(tx, {
        conversationId: person(1).conversationId,
        serviceId: ids.serviceId,
        startsAt: MONDAY_9,
        turnStartedAt: AFTER_TTL,
      }),
    );
    expect(offered).toBe(true);
    await sweep();
    expect(sent).toHaveLength(1);
  });

  it('after the offer expires the next entry is offered', async () => {
    await sweep();
    await sweep(AFTER_TTL);
    expect(sent.map((one) => one.conversationId)).toEqual([
      person(1).conversationId,
      person(2).conversationId,
    ]);
  });

  it('a closed window skips the entry, tells the professional and goes to the next', async () => {
    await setConversation(1, { windowExpiresAt: null });
    await sweep();
    expect(sent.map((one) => one.conversationId)).toEqual([person(2).conversationId]);
    expect(notify).toHaveBeenCalledWith({
      tenantId,
      conversationId: person(1).conversationId,
      reason: NotifyReason.waitlistSlot,
    });
    expect((await offers()).map((offer) => offer.state)).toEqual([
      SlotOfferState.skipped,
      SlotOfferState.open,
    ]);
  });

  it('human control skips the entry (RF-31)', async () => {
    await setConversation(1, { control: ConversationControl.human });
    await sweep();
    expect(sent.map((one) => one.conversationId)).toEqual([person(2).conversationId]);
  });

  it('an opted-out client is never messaged and leaves the list', async () => {
    await inTenant((tx) =>
      recordConsent(tx, {
        tenantId,
        contactId: person(1).contactId,
        kind: ConsentKind.opt_out,
        category: ConsentCategory.all,
        source: ConsentSource.patient_message,
        actor: { type: ConsentActor.contact },
        now: NOW,
      }),
    );
    await sweep();
    expect(sent.map((one) => one.conversationId)).toEqual([person(2).conversationId]);
    expect(notify).not.toHaveBeenCalled();
    const [first] = await offers();
    expect(first?.entry.status).toBe(WaitlistStatus.removed);
  });
});

describe('no-show message', () => {
  const realNow = () => new Date();
  const past = () => new Date(Date.now() - 2 * HOUR_MS);
  const enable = () =>
    db.client.tenant.update({ where: { id: tenantId }, data: { noShowFollowUp: true } });
  const noShows = () =>
    sweepNoShows({ db, channel, notify, alert, now: realNow(), onlyTenantId: tenantId });
  const open = () => setConversation(0, { windowExpiresAt: new Date(Date.now() + HOUR_MS) });

  it('is off by default', async () => {
    await open();
    await appointment(0, AppointmentStatus.no_show, past());
    await noShows();
    expect(sent).toEqual([]);
  });

  it('asks the client once when to reschedule', async () => {
    await enable();
    await open();
    await appointment(0, AppointmentStatus.no_show, past());
    await noShows();
    await noShows();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain('Quer remarcar?');
  });

  it('a second no-show gets no message (the owner decides what happens to the session)', async () => {
    await enable();
    await open();
    await appointment(0, AppointmentStatus.no_show, new Date(Date.now() - 10 * 24 * HOUR_MS));
    await appointment(0, AppointmentStatus.no_show, past());
    await noShows();
    expect(sent).toEqual([]);
  });

  it('outside the window the professional is told instead', async () => {
    await enable();
    await appointment(0, AppointmentStatus.no_show, past());
    await setConversation(0, { windowExpiresAt: null });
    await noShows();
    expect(sent).toEqual([]);
    expect(notify).toHaveBeenCalledWith({
      tenantId,
      conversationId: person(0).conversationId,
      reason: NotifyReason.noShow,
    });
  });
});
