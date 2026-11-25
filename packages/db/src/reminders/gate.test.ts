import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AppointmentStatus,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  createDb,
  proactiveGate,
  GateRefusal,
  recordConsent,
  ConsentActor,
  MessageCategory,
} from '../index.ts';

// A-15: nothing proactive goes to a contact who opted out, or for a cancelled appointment.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-01-01T12:00:00Z');
const LATER = new Date('2027-01-04T12:00:00Z');

let tenantId = '';
let contactId = '';
let appointmentId = '';

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Gate (fictício)', slug: `gate-${randomUUID()}` },
  });
  tenantId = tenant.id;
  ({ contactId, appointmentId } = await db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
    const appointment = await tx.appointment.create({
      data: {
        tenantId,
        professionalId: professional.id,
        contactId: contact.id,
        serviceId: service.id,
        startsAt: LATER,
        endsAt: new Date(LATER.getTime() + 3_600_000),
      },
    });
    return { contactId: contact.id, appointmentId: appointment.id };
  }));
});

const gate = (input: { appointmentId?: string; now?: Date; category?: MessageCategory } = {}) =>
  db.withTenant(tenantId, (tx) => proactiveGate(tx, { contactId, now: NOW, ...input }));

const optOut = (
  kind: ConsentKind = ConsentKind.opt_out,
  category: ConsentCategory = ConsentCategory.all,
) =>
  db.withTenant(tenantId, (tx) =>
    recordConsent(tx, {
      tenantId,
      contactId,
      kind,
      category,
      source: ConsentSource.patient_message,
      actor: { type: ConsentActor.contact },
      now: NOW,
    }),
  );

describe('proactiveGate', () => {
  it('lets a live appointment of a contact in good standing through', async () => {
    expect(await gate({ appointmentId })).toEqual({ ok: true });
  });

  it('refuses a contact who opted out, and lets them back after an opt-in', async () => {
    await optOut();
    expect(await gate({ appointmentId })).toEqual({ ok: false, reason: GateRefusal.optOut });
    await optOut(ConsentKind.opt_in);
    expect(await gate({ appointmentId })).toEqual({ ok: true });
  });

  it('reads the consent history too, not only the flag', async () => {
    await optOut();
    await db.withTenant(tenantId, (tx) =>
      tx.contact.update({ where: { id: contactId }, data: { optOutAt: null } }),
    );
    expect(await gate()).toEqual({ ok: false, reason: GateRefusal.optOut });
  });

  it('ignores a marketing-only opt-out: the appointment reminder is a service message', async () => {
    await optOut(ConsentKind.opt_out, ConsentCategory.marketing);
    expect(await gate({ appointmentId })).toEqual({ ok: true });
  });

  it('marketing needs a recorded marketing opt-in; reminders stay transactional', async () => {
    const marketing = () => gate({ category: MessageCategory.marketing });
    expect(await marketing()).toEqual({ ok: false, reason: GateRefusal.noMarketingConsent });
    await optOut(ConsentKind.opt_in, ConsentCategory.service);
    expect(await marketing()).toEqual({ ok: false, reason: GateRefusal.noMarketingConsent });
    expect(await gate({ appointmentId })).toEqual({ ok: true });
    await optOut(ConsentKind.opt_in, ConsentCategory.marketing);
    expect(await marketing()).toEqual({ ok: true });
    await optOut(ConsentKind.opt_out, ConsentCategory.marketing);
    expect(await marketing()).toEqual({ ok: false, reason: GateRefusal.noMarketingConsent });
    await optOut(ConsentKind.opt_in, ConsentCategory.marketing);
    await optOut();
    expect(await marketing()).toEqual({ ok: false, reason: GateRefusal.optOut });
  });

  it('keeps the date, origin and text shown of an opt-in', async () => {
    await db.withTenant(tenantId, (tx) =>
      recordConsent(tx, {
        tenantId,
        contactId,
        kind: ConsentKind.opt_in,
        category: ConsentCategory.marketing,
        source: ConsentSource.form,
        actor: { type: ConsentActor.contact },
        noticeText: 'Aceito receber novidades.',
        now: NOW,
      }),
    );
    const [event] = await db.withTenant(tenantId, (tx) => tx.consentEvent.findMany());
    expect(event).toMatchObject({
      source: 'form',
      noticeText: 'Aceito receber novidades.',
      createdAt: NOW,
    });
  });

  it.each([AppointmentStatus.cancelled, AppointmentStatus.completed, AppointmentStatus.no_show])(
    'refuses an appointment that is %s',
    async (status) => {
      await db.withTenant(tenantId, (tx) =>
        tx.appointment.update({ where: { id: appointmentId }, data: { status } }),
      );
      expect(await gate({ appointmentId })).toEqual({
        ok: false,
        reason: GateRefusal.appointmentNotLive,
      });
    },
  );

  it('accepts a confirmed appointment and refuses one that already started', async () => {
    await db.withTenant(tenantId, (tx) =>
      tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.confirmed },
      }),
    );
    expect(await gate({ appointmentId })).toEqual({ ok: true });
    expect(await gate({ appointmentId, now: new Date(LATER.getTime() + 1) })).toEqual({
      ok: false,
      reason: GateRefusal.appointmentNotLive,
    });
  });
});
