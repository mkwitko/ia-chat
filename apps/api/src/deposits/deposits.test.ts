import { randomUUID } from 'node:crypto';
import { AppointmentCreator, PaymentStatus, Plan, bookAppointment } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';
import { DEPOSIT_SETTINGS_PATH } from './deposit-settings-routes.ts';
import { DEPOSITS_PATH } from './deposit-routes.ts';

// H-52: Pix key and deposit per service (owner), pending list and one-tap confirmation.
// Fictitious data.

const NOW = new Date('2027-01-01T12:00:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let ctx: TestContext;
let owner: string;
let receptionist: string;
let tenantId: string;
let serviceId: string;
let contactId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  receptionist = await joinAs(ctx, { ownerCookie: owner, tenantId, role: Role.receptionist });
  await ctx.db.client.tenant.update({ where: { id: tenantId }, data: { plan: Plan.agenda } });
  ({ serviceId, contactId } = await ctx.db.withTenant(tenantId, async (tx) => {
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
    const contact = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${randomUUID()}`, name: 'Paciente Fictício' },
    });
    return { serviceId: service.id, contactId: contact.id };
  }));
});
afterAll(() => ctx.app.close());

const inject = (method: 'GET' | 'PUT' | 'POST', url: string, cookie = owner) =>
  ctx.app.inject({ method, url, headers: { cookie } });
const put = (payload: object, cookie = owner) =>
  ctx.app.inject({ method: 'PUT', url: DEPOSIT_SETTINGS_PATH, headers: { cookie }, payload });

const settings = (pixKey: string) => ({
  pixKey,
  receiverName: 'Clínica Exemplo',
  city: 'São Paulo',
  holdMinutes: 30,
  refundPolicy: 'Devolvemos o sinal com 24 h de aviso.',
  services: [{ id: serviceId, depositCents: 5_000 }],
});

describe('deposit settings', () => {
  it('saves a valid key normalized and the deposit of the service', async () => {
    const reply = await put(settings('+55 (11) 99999-0000'));
    expect(reply.statusCode).toBe(200);
    const view = reply.json<{
      settings: { pixKey: string };
      services: { depositCents: number }[];
    }>();
    expect(view.settings.pixKey).toBe('+5511999990000');
    expect(view.services[0]?.depositCents).toBe(5_000);
  });

  it('refuses something that is not a Pix key, and the receptionist', async () => {
    const bad = await put(settings('minha chave'));
    expect(bad.statusCode).toBe(422);
    const denied = await put(settings('a@b.com'), receptionist);
    expect(denied.statusCode).toBe(403);
  });
});

describe('pending deposits', () => {
  it('lists the held booking and confirms it with one tap, once', async () => {
    const booked = await bookAppointment(ctx.db, {
      tenantId,
      contactId,
      serviceId,
      startsAt: MONDAY_9,
      key: randomUUID(),
      createdBy: AppointmentCreator.ai,
      now: NOW,
      deposit: { amountCents: 5_000, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    expect(booked.ok).toBe(true);
    const listed = (await inject('GET', DEPOSITS_PATH, receptionist)).json<
      { id: string; amountCents: number; contactName: string }[]
    >();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ amountCents: 5_000, contactName: 'Paciente Fictício' });
    const id = listed[0]?.id ?? '';
    const confirmed = await inject('POST', `${DEPOSITS_PATH}/${id}/confirm`, receptionist);
    expect(confirmed.statusCode).toBe(200);
    const payment = await ctx.db.withTenant(tenantId, (tx) =>
      tx.payment.findUniqueOrThrow({ where: { id } }),
    );
    expect(payment.status).toBe(PaymentStatus.paid);
    expect((await inject('GET', DEPOSITS_PATH)).json()).toEqual([]);
  });

  it('answers 409 for an expired deposit and 404 for another tenant', async () => {
    const id = await ctx.db.withTenant(tenantId, async (tx) => {
      const appointment = await tx.appointment.findFirstOrThrow();
      const row = await tx.payment.create({
        data: {
          tenantId,
          appointmentId: appointment.id,
          amountCents: 5_000,
          provider: 'pix_manual',
          status: PaymentStatus.expired,
        },
      });
      return row.id;
    });
    const late = await inject('POST', `${DEPOSITS_PATH}/${id}/confirm`);
    expect(late.statusCode).toBe(409);
    expect(late.json<{ error: string }>().error).toBe('deposit_expired');
    const stranger = await signUpVerified(ctx);
    await createTenant(ctx, stranger);
    expect((await inject('POST', `${DEPOSITS_PATH}/${id}/confirm`, stranger)).statusCode).toBe(404);
  });
});
