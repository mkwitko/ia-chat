import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AgendaError,
  bookAppointment,
  createDb,
  rescheduleAppointment,
  slotsAcross,
  type BookRequest,
} from '../index.ts';
import { AppointmentCreator } from '../../generated/prisma/enums.ts';

// Spec 05, "Agenda por profissional": each professional has their own rules and bookings; a
// service is performed by the professionals linked to it (none linked: every service).

const db = createDb(process.env.DATABASE_URL ?? '', { max: 8 });
afterAll(() => db.client.$disconnect());

// Fri 2027-01-01 09:00 in Sao Paulo. Ana works Mondays 09:00-12:00, Bruno 09:00-11:00.
const NOW = new Date('2027-01-01T12:00:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const MONDAY_10 = new Date('2027-01-04T13:00:00Z');
const MONDAY_11 = new Date('2027-01-04T14:00:00Z');
const MONDAY_END = new Date('2027-01-04T15:00:00Z');
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let tenantId = '';
let ana = '';
let bruno = '';
let session = '';
let assessment = '';
let contacts: string[] = [];

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Clínica (fictícia)', slug: `pro-${randomUUID()}` },
  });
  tenantId = tenant.id;
  await db.withTenant(tenantId, async (tx) => {
    const team = [];
    for (const [name, end] of [
      ['Ana Exemplo', '12:00'],
      ['Bruno Exemplo', '11:00'],
    ] as const) {
      const one = await tx.professional.create({ data: { tenantId, name } });
      await tx.availabilityRule.create({
        data: {
          tenantId,
          professionalId: one.id,
          weekday: 1,
          startTime: at('09:00'),
          endTime: at(end),
        },
      });
      team.push(one.id);
    }
    [ana = '', bruno = ''] = team;
    const sessao = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const avaliacao = await tx.service.create({
      data: { tenantId, name: 'Avaliação', durationMinutes: 60, priceCents: 25_000 },
    });
    session = sessao.id;
    assessment = avaliacao.id;
    // Bruno performs only the session; Ana has no link, so she performs everything.
    await tx.professionalService.create({
      data: { tenantId, professionalId: bruno, serviceId: session },
    });
    const made = await Promise.all(
      [1, 2, 3].map(() => tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } })),
    );
    contacts = made.map((contact) => contact.id);
  });
});

const across = (serviceId: string, professionalId?: string) =>
  db.withTenant(tenantId, (tx) =>
    slotsAcross(tx, {
      serviceId,
      professionalId,
      timezone: 'America/Sao_Paulo',
      durationMinutes: 60,
      from: MONDAY_9,
      to: MONDAY_END,
      now: NOW,
    }),
  );

const request = (contact: number, extra: Partial<BookRequest>): BookRequest => ({
  tenantId,
  contactId: contacts[contact] ?? '',
  serviceId: session,
  startsAt: MONDAY_9,
  key: randomUUID(),
  createdBy: AppointmentCreator.ai,
  now: NOW,
  ...extra,
});

const ownerOf = (id: string) =>
  db.withTenant(tenantId, (tx) => tx.appointment.findUniqueOrThrow({ where: { id } }));

describe('slotsAcross', () => {
  it('merges the free slots of every professional who performs the service, with names', async () => {
    const slots = await across(session);
    expect(slots.map((slot) => [slot.start, slot.professionalName])).toEqual([
      [MONDAY_9, 'Ana Exemplo'],
      [MONDAY_9, 'Bruno Exemplo'],
      [MONDAY_10, 'Ana Exemplo'],
      [MONDAY_10, 'Bruno Exemplo'],
      [MONDAY_11, 'Ana Exemplo'],
    ]);
  });

  it('leaves out who does not perform the service', async () => {
    const slots = await across(assessment);
    expect(new Set(slots.map((slot) => slot.professionalId))).toEqual(new Set([ana]));
  });

  it('narrows to the named professional', async () => {
    const slots = await across(session, bruno);
    expect(slots.map((slot) => slot.start)).toEqual([MONDAY_9, MONDAY_10]);
    expect(await across(assessment, bruno)).toEqual([]);
  });
});

describe('booking per professional', () => {
  it('the same time books once per professional; a third is slot_taken (A-10)', async () => {
    const first = await bookAppointment(db, request(0, { professionalId: ana }));
    const second = await bookAppointment(db, request(1, { professionalId: bruno }));
    const third = await bookAppointment(db, request(2, { professionalId: ana }));
    expect([first.ok, second.ok]).toEqual([true, true]);
    expect(third).toEqual({ ok: false, error: AgendaError.slotTaken });
  });

  it('without a professional, the first free performer takes it and the booking stores them', async () => {
    const first = await bookAppointment(db, request(0, {}));
    const second = await bookAppointment(db, request(1, {}));
    if (!first.ok || !second.ok) throw new Error('booking failed');
    expect((await ownerOf(first.value.id)).professionalId).toBe(ana);
    expect((await ownerOf(second.value.id)).professionalId).toBe(bruno);
    expect(second.value.professionalName).toBe('Bruno Exemplo');
    const third = await bookAppointment(db, request(2, {}));
    expect(third).toEqual({ ok: false, error: AgendaError.slotTaken });
  });

  it('refuses a professional who does not perform the service', async () => {
    const result = await bookAppointment(
      db,
      request(0, { serviceId: assessment, professionalId: bruno }),
    );
    expect(result).toEqual({ ok: false, error: AgendaError.professionalNotFound });
  });

  it('a reschedule keeps the professional unless another is asked', async () => {
    const booked = await bookAppointment(db, request(0, { professionalId: bruno }));
    if (!booked.ok) throw new Error('booking failed');
    const moved = await rescheduleAppointment(db, {
      ...request(0, { startsAt: MONDAY_10 }),
      appointmentId: booked.value.id,
    });
    if (!moved.ok) throw new Error('move failed');
    expect((await ownerOf(moved.value.id)).professionalId).toBe(bruno);
  });
});
