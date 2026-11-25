import { randomUUID } from 'node:crypto';
import {
  AppointmentStatus,
  ConsentActor,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  ScheduledMessageKind,
  ScheduledMessageState,
  createDb,
  recordConsent,
} from '@app/db';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ReminderChannel } from './deliver.ts';
import { sweepScheduledMessages } from './sweep.ts';

// E-22 with the database and a fake channel: RF-46, RF-47, A-15 and M-01.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-01-03T12:00:00Z');
const STARTS_AT = new Date('2027-01-04T12:00:00Z');
const WINDOW_OPEN = new Date('2027-01-04T11:00:00Z');

let tenantId = '';
let contactId = '';
let conversationId = '';
let appointmentId = '';
let sent: { via: 'text' | 'template'; body: string }[] = [];
let channel: ReminderChannel;

beforeEach(async () => {
  sent = [];
  channel = {
    send: (_tx, { text }) => {
      sent.push({ via: 'text', body: text });
      return Promise.resolve({ providerMessageId: `fake.${randomUUID()}` });
    },
    sendTemplate: (_tx, { template, vars }) => {
      sent.push({ via: 'template', body: `${template.name}:${vars.join('|')}` });
      return Promise.resolve({ providerMessageId: `fake.${randomUUID()}` });
    },
  };
  const tenant = await db.client.tenant.create({
    data: { name: 'Lembretes (fictício)', slug: `rem-${randomUUID()}` },
  });
  tenantId = tenant.id;
  ({ contactId, conversationId, appointmentId } = await db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const location = await tx.location.create({
      data: { tenantId, name: 'Sede', address: 'Rua Exemplo, 100' },
    });
    const channelRow = await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } });
    const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
    const conversation = await tx.conversation.create({
      data: { tenantId, channelId: channelRow.id, contactId: contact.id },
    });
    const appointment = await tx.appointment.create({
      data: {
        tenantId,
        professionalId: professional.id,
        contactId: contact.id,
        serviceId: service.id,
        locationId: location.id,
        startsAt: STARTS_AT,
        endsAt: new Date(STARTS_AT.getTime() + 3_600_000),
      },
    });
    return {
      contactId: contact.id,
      conversationId: conversation.id,
      appointmentId: appointment.id,
    };
  }));
});

const schedule = (kind: ScheduledMessageKind, sequence = 0) =>
  db.withTenant(tenantId, (tx) =>
    tx.scheduledMessage.create({
      data: { tenantId, contactId, appointmentId, conversationId, kind, sequence, sendAt: NOW },
    }),
  );
const openWindow = () =>
  db.withTenant(tenantId, (tx) =>
    tx.conversation.update({
      where: { id: conversationId },
      data: { windowExpiresAt: WINDOW_OPEN },
    }),
  );
const sweep = () =>
  sweepScheduledMessages({ db, channel, alert: vi.fn(), now: NOW, onlyTenantId: tenantId });
const stateOf = (id: string) =>
  db.withTenant(tenantId, (tx) =>
    tx.scheduledMessage.findUniqueOrThrow({ where: { id } }).then((row) => row.state),
  );

describe('reminder sweep', () => {
  it('sends free text inside the 24 h window and records the message', async () => {
    await openWindow();
    const { id } = await schedule(ScheduledMessageKind.confirmation);
    expect((await sweep()).sent).toBe(1);
    expect(sent).toEqual([
      {
        via: 'text',
        body: 'Agendamento confirmado: Sessão em 04/01/2027 às 09:00. Local: Rua Exemplo, 100. Se precisar remarcar, é só responder aqui.',
      },
    ]);
    expect(await stateOf(id)).toBe(ScheduledMessageState.sent);
    const stored = await db.withTenant(tenantId, (tx) =>
      tx.message.count({ where: { conversationId } }),
    );
    expect(stored).toBe(1);
  });

  it('sends the approved template outside the window', async () => {
    await schedule(ScheduledMessageKind.reminder);
    await sweep();
    expect(sent).toEqual([
      { via: 'template', body: 'lembrete_agendamento:Sessão|04/01/2027|09:00|Rua Exemplo, 100' },
    ]);
  });

  it('holds the second reminder back when the window is closed', async () => {
    const { id } = await schedule(ScheduledMessageKind.reminder, 1);
    expect((await sweep()).window_closed).toBe(1);
    expect(sent).toEqual([]);
    expect(await stateOf(id)).toBe(ScheduledMessageState.cancelled);
  });

  it('sends nothing to a contact who opted out (M-01, A-15)', async () => {
    await openWindow();
    const { id } = await schedule(ScheduledMessageKind.reminder);
    await db.withTenant(tenantId, (tx) =>
      recordConsent(tx, {
        tenantId,
        contactId,
        kind: ConsentKind.opt_out,
        category: ConsentCategory.all,
        source: ConsentSource.patient_message,
        actor: { type: ConsentActor.contact },
        now: NOW,
      }),
    );
    expect((await sweep()).refused).toBe(1);
    expect(sent).toEqual([]);
    expect(await stateOf(id)).toBe(ScheduledMessageState.cancelled);
  });

  it('sends nothing for a cancelled appointment even if the row was left behind (A-15)', async () => {
    await openWindow();
    const { id } = await schedule(ScheduledMessageKind.reminder);
    await db.withTenant(tenantId, (tx) =>
      tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.cancelled },
      }),
    );
    expect((await sweep()).refused).toBe(1);
    expect(sent).toEqual([]);
    expect(await stateOf(id)).toBe(ScheduledMessageState.cancelled);
  });

  it('does not touch a message that is not due yet', async () => {
    const later = await db.withTenant(tenantId, (tx) =>
      tx.scheduledMessage.create({
        data: {
          tenantId,
          contactId,
          appointmentId,
          conversationId,
          kind: ScheduledMessageKind.reminder,
          sendAt: new Date(NOW.getTime() + 60_000),
        },
      }),
    );
    await sweep();
    expect(sent).toEqual([]);
    expect(await stateOf(later.id)).toBe(ScheduledMessageState.scheduled);
  });

  it('fails a message the channel refuses, alerts, and does not retry it forever', async () => {
    const { id } = await schedule(ScheduledMessageKind.reminder);
    const alert = vi.fn();
    const broken: ReminderChannel = {
      ...channel,
      sendTemplate: () => Promise.reject(new Error('channel down')),
    };
    const result = await sweepScheduledMessages({
      db,
      channel: broken,
      alert,
      now: NOW,
      onlyTenantId: tenantId,
    });
    expect(result.failed).toBe(1);
    expect(alert).toHaveBeenCalledOnce();
    expect(await stateOf(id)).toBe(ScheduledMessageState.failed);
  });
});
