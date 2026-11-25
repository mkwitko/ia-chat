import { randomUUID } from 'node:crypto';
import { AppointmentStatus, createDb, type Db } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { buildSummaryNotice } from '../notify/summary-notice.ts';
import { sendNightlySummary } from './nightly-summary.ts';
import { summaryCron } from './summary-schedule.ts';

// E-22b (RF-15, RN-38): the nightly push has the count and a link, never a patient name.

const db: Db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const PATIENT_NAME = 'Maria Fictícia da Silva';
// Mon 2027-01-04 23:00 UTC = 20:00 in Sao Paulo; "amanhã" is Tue 2027-01-05 local.
const NOW = new Date('2027-01-04T23:00:00Z');
const TOMORROW = '2027-01-05';
const SLOTS = {
  tomorrow: new Date('2027-01-05T12:00:00Z'),
  tomorrowLate: new Date('2027-01-05T20:00:00Z'),
  today: new Date('2027-01-04T15:00:00Z'),
  afterTomorrow: new Date('2027-01-06T12:00:00Z'),
};
const HOUR_MS = 3_600_000;

async function tenantWith(starts: [Date, AppointmentStatus][]) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Resumo (fictício)', slug: `rs-${randomUUID()}` },
  });
  await db.withTenant(tenant.id, async (tx) => {
    const professional = await tx.professional.create({
      data: { tenantId: tenant.id, name: 'Dr. Exemplo' },
    });
    const service = await tx.service.create({
      data: { tenantId: tenant.id, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const contact = await tx.contact.create({
      data: { tenantId: tenant.id, bsuid: `BR.${randomUUID()}`, name: PATIENT_NAME },
    });
    for (const [startsAt, status] of starts)
      await tx.appointment.create({
        data: {
          tenantId: tenant.id,
          professionalId: professional.id,
          contactId: contact.id,
          serviceId: service.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + HOUR_MS),
          status,
        },
      });
  });
  return tenant.id;
}

async function run(tenantId: string) {
  const sent: object[] = [];
  const after = await db.withTenant(tenantId, (tx) =>
    sendNightlySummary(tx, { tenantId, now: NOW }, (summary) => {
      sent.push(summary);
      return Promise.resolve();
    }),
  );
  await after?.();
  return sent;
}

describe('nightly summary', () => {
  it('counts tomorrow in the tenant zone, ignores cancelled ones and other days', async () => {
    const live = AppointmentStatus.scheduled;
    const tenantId = await tenantWith([
      [SLOTS.tomorrow, live],
      [SLOTS.tomorrowLate, AppointmentStatus.confirmed],
      [SLOTS.today, live],
      [SLOTS.afterTomorrow, live],
    ]);
    expect(await run(tenantId)).toEqual([{ count: 2, day: TOMORROW }]);
  });

  it('sends nothing for an empty day', async () => {
    const tenantId = await tenantWith([[SLOTS.tomorrow, AppointmentStatus.cancelled]]);
    expect(await run(tenantId)).toEqual([]);
  });

  it('the notice carries the count and the link, no name', () => {
    const notice = buildSummaryNotice({ count: 3, day: TOMORROW });
    expect(notice.title).toBe('Sua agenda de amanhã');
    expect(notice.body).toContain('3 atendimentos');
    expect(notice.url).toBe(`/agenda?dia=${TOMORROW}`);
    expect(JSON.stringify(notice)).not.toContain(PATIENT_NAME);
  });
});

describe('schedule', () => {
  it('turns the minute of the day into a cron expression (default 20:00)', () => {
    expect(summaryCron(1200)).toBe('0 20 * * *');
    expect(summaryCron(455)).toBe('35 7 * * *');
  });
});
