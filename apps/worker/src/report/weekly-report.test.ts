import { randomUUID } from 'node:crypto';
import { AppointmentCreator, AppointmentStatus, createDb, type Db } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { readWeeklyReport } from './weekly-report.ts';
import { weeklyEmail, weeklyLines, weeklyNotice, type WeeklyReport } from './weekly-text.ts';
import { WEEKLY_CRON } from './wiring.ts';

// Research 09 #2: every Monday the owner gets five lines of counts. Never a patient's name or
// a message; the owner can turn it off.

const db: Db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const PATIENT = 'Joana Fictícia Souza';
// Mon 2027-01-11 08:00 in Sao Paulo: the week reported is Mon 01-04 to Sun 01-10.
const NOW = new Date('2027-01-11T11:00:00Z');
const IN_WEEK = new Date('2027-01-05T12:00:00Z');
const BEFORE = new Date('2027-01-02T12:00:00Z');
const PRICE = 20_000;
const HOUR = 3_600_000;

async function seed(enabled: boolean) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Semana (fictício)', slug: `wk-${randomUUID()}`, weeklyReport: enabled },
  });
  const tenantId = tenant.id;
  await db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: PRICE },
    });
    const contact = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${randomUUID()}`, name: PATIENT },
    });
    const base = { tenantId, professionalId: professional.id, contactId: contact.id };
    const book = (startsAt: Date, status: AppointmentStatus, createdAt: Date) =>
      tx.appointment.create({
        data: {
          ...base,
          serviceId: service.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + HOUR),
          status,
          createdBy: AppointmentCreator.ai,
          createdAt,
        },
      });
    await book(IN_WEEK, AppointmentStatus.completed, BEFORE);
    await book(new Date(IN_WEEK.getTime() + 2 * HOUR), AppointmentStatus.scheduled, IN_WEEK);
    await tx.knowledgeItem.create({ data: { tenantId, question: 'Aceita convênio?' } });
  });
  return tenantId;
}

const SAMPLE: WeeklyReport = {
  from: '2027-01-04',
  to: '2027-01-10',
  answered: 12,
  booked: 4,
  attended: 6,
  valueCents: 108_000,
  unanswered: 2,
  minSample: 5,
};

describe('weekly report', () => {
  it('reads last week from rows, in the tenant timezone', async () => {
    const tenantId = await seed(true);
    const report = await db.withTenant(tenantId, (tx) =>
      readWeeklyReport(tx, { tenantId, now: NOW }),
    );
    expect(report).toEqual({
      from: '2027-01-04',
      to: '2027-01-10',
      answered: 0,
      booked: 1,
      attended: 1,
      valueCents: PRICE,
      unanswered: 1,
      minSample: 5,
    });
  });

  it('is off when the owner turned it off', async () => {
    const tenantId = await seed(false);
    const report = await db.withTenant(tenantId, (tx) =>
      readWeeklyReport(tx, { tenantId, now: NOW }),
    );
    expect(report).toBeNull();
  });

  it('writes five lines of counts and the money only with enough sample', () => {
    const lines = weeklyLines(SAMPLE);
    expect(lines).toHaveLength(5);
    expect(lines[3]).toContain('R$');
    const small = weeklyLines({ ...SAMPLE, attended: 2 });
    expect(small[3]).toContain('ainda sem dados');
    expect(small[3]).not.toContain('R$');
  });

  it('never carries a patient name or message text', () => {
    const email = weeklyEmail({ to: 'dono@exemplo.test', report: SAMPLE, panelUrl: 'https://x' });
    const notice = weeklyNotice(SAMPLE);
    const all = `${email.subject}${email.text}${notice.title}${notice.body}`;
    expect(all).not.toContain(PATIENT);
    expect(all).not.toContain('convênio');
    expect(email.text).toContain('https://x/resultados');
  });

  it('runs on Mondays at 08:00', () => {
    expect(WEEKLY_CRON).toBe('0 8 * * 1');
  });
});
