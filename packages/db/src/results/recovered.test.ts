import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from '../index.ts';
import { AppointmentCreator, AppointmentStatus } from '../../generated/prisma/enums.ts';
import { recoveredMoney } from './recovered.ts';

// Research 09 #1: "dinheiro recuperado" counts only appointments the assistant booked that the
// owner marked "compareceu", valued at the service price. Nothing estimated.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const TZ = 'America/Sao_Paulo';
const JANUARY = { start: new Date('2027-01-01T03:00:00Z'), end: new Date('2027-02-01T03:00:00Z') };
const PRICE = 18_000;
const HOUR = 3_600_000;
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

interface Row {
  startsAt: string;
  createdAt: string;
  status: AppointmentStatus;
  by: AppointmentCreator;
}

// Mon 2027-01-04 09:00 local; booked Fri 2027-01-01 22:00 local (closed: only Mondays 9-12).
const AFTER_HOURS: Row = {
  startsAt: '2027-01-04T12:00:00Z',
  createdAt: '2027-01-02T01:00:00Z',
  status: AppointmentStatus.completed,
  by: AppointmentCreator.ai,
};
// Mon 2027-01-11 09:00 local; booked Mon 2027-01-04 10:00 local (open).
const IN_HOURS: Row = {
  startsAt: '2027-01-11T12:00:00Z',
  createdAt: '2027-01-04T13:00:00Z',
  status: AppointmentStatus.completed,
  by: AppointmentCreator.ai,
};
const IGNORED: Row[] = [
  { ...IN_HOURS, startsAt: '2027-01-18T12:00:00Z', status: AppointmentStatus.no_show },
  { ...IN_HOURS, startsAt: '2027-01-18T14:00:00Z', by: AppointmentCreator.human },
  { ...IN_HOURS, startsAt: '2027-01-18T16:00:00Z', status: AppointmentStatus.cancelled },
  { ...IN_HOURS, startsAt: '2027-01-25T12:00:00Z', status: AppointmentStatus.scheduled },
  { ...IN_HOURS, startsAt: '2027-02-01T12:00:00Z' },
];

async function tenantWith(rows: Row[], { open }: { open: boolean }) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Recuperado (fictício)', slug: `rec-${randomUUID()}` },
  });
  const tenantId = tenant.id;
  await db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    if (open)
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
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: PRICE },
    });
    const contact = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${randomUUID()}`, name: 'Paciente Fictício' },
    });
    for (const row of rows) {
      const startsAt = new Date(row.startsAt);
      await tx.appointment.create({
        data: {
          tenantId,
          professionalId: professional.id,
          contactId: contact.id,
          serviceId: service.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + HOUR),
          status: row.status,
          createdBy: row.by,
          createdAt: new Date(row.createdAt),
        },
      });
    }
  });
  return tenantId;
}

describe('recoveredMoney', () => {
  it('counts attended assistant bookings at the service price, by local week', async () => {
    const tenantId = await tenantWith([AFTER_HOURS, IN_HOURS, ...IGNORED], { open: true });
    const result = await db.withTenant(tenantId, (tx) =>
      recoveredMoney(tx, { range: JANUARY, timezone: TZ }),
    );
    expect(result).toEqual({
      count: 2,
      valueCents: 2 * PRICE,
      afterHours: 1,
      weeks: [
        { week: '2027-01-04', count: 1, valueCents: PRICE },
        { week: '2027-01-11', count: 1, valueCents: PRICE },
      ],
    });
  });

  it('says nothing about after hours when no opening hours are set', async () => {
    const tenantId = await tenantWith([AFTER_HOURS], { open: false });
    const result = await db.withTenant(tenantId, (tx) =>
      recoveredMoney(tx, { range: JANUARY, timezone: TZ }),
    );
    expect(result.count).toBe(1);
    expect(result.afterHours).toBe(0);
  });

  it('is zero for an account with no data', async () => {
    const tenantId = await tenantWith([], { open: true });
    const result = await db.withTenant(tenantId, (tx) =>
      recoveredMoney(tx, { range: JANUARY, timezone: TZ }),
    );
    expect(result).toEqual({ count: 0, valueCents: 0, afterHours: 0, weeks: [] });
  });
});
