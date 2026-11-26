import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Attendance, createDb, markAttendance, type Tx } from '../index.ts';
import { AppointmentStatus, PackageEntryReason } from '../../generated/prisma/enums.ts';
import { adjustPackage, PackageError } from './adjust.ts';
import { contactPackages } from './balance.ts';
import { registerPackage } from './register.ts';

// Research 09 #7: each "Compareceu" debits one session of the client's oldest open package, once.
// Undoing the mark gives it back; "Faltou" and cancelled never debit; the owner adjusts by one.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-01-20T12:00:00Z');
const HOUR = 3_600_000;
const DAY = 86_400_000;

interface World {
  tenantId: string;
  contactId: string;
  professionalId: string;
  serviceId: string;
}
let world: World;
let slot = 0;

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Pacotes (fictício)', slug: `pk-${randomUUID()}` },
  });
  const tenantId = tenant.id;
  world = await db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 25_000 },
    });
    const contact = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${randomUUID()}`, name: 'Cliente Fictício' },
    });
    return {
      tenantId,
      contactId: contact.id,
      professionalId: professional.id,
      serviceId: service.id,
    };
  });
});

const inTenant = <T>(fn: (tx: Tx) => Promise<T>) => db.withTenant(world.tenantId, fn);

async function pastAppointment(status: AppointmentStatus = AppointmentStatus.scheduled) {
  slot += 1;
  const startsAt = new Date(NOW.getTime() - DAY - slot * 2 * HOUR);
  const row = await inTenant((tx) =>
    tx.appointment.create({
      data: {
        tenantId: world.tenantId,
        professionalId: world.professionalId,
        contactId: world.contactId,
        serviceId: world.serviceId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR),
        status,
      },
    }),
  );
  return row.id;
}

const buy = (sessions: number, purchasedOn: string) =>
  inTenant((tx) =>
    registerPackage(tx, {
      tenantId: world.tenantId,
      contactId: world.contactId,
      name: `Pacote ${String(sessions)} sessões`,
      sessions,
      priceCents: sessions * 20_000,
      purchasedOn,
      paid: true,
    }),
  );

const mark = (appointmentId: string, outcome: Attendance) =>
  markAttendance(db, { tenantId: world.tenantId, appointmentId, outcome, now: NOW });

const used = async () =>
  (await inTenant((tx) => contactPackages(tx, world.contactId))).map((p) => [p.name, p.used]);

describe('package debit on attendance', () => {
  it('debits the oldest open package once, however often "Compareceu" is marked', async () => {
    await buy(4, '2027-01-02');
    const id = await pastAppointment();
    expect((await mark(id, Attendance.attended)).ok).toBe(true);
    expect((await mark(id, Attendance.attended)).ok).toBe(true);
    expect(await used()).toEqual([['Pacote 4 sessões', 1]]);
  });

  it('gives the session back when the mark turns to "Faltou", and takes it again', async () => {
    await buy(4, '2027-01-02');
    const id = await pastAppointment();
    await mark(id, Attendance.attended);
    await mark(id, Attendance.noShow);
    expect(await used()).toEqual([['Pacote 4 sessões', 0]]);
    await mark(id, Attendance.attended);
    expect(await used()).toEqual([['Pacote 4 sessões', 1]]);
    const reasons = await inTenant(async (tx) =>
      (await tx.packageEntry.findMany({ orderBy: { createdAt: 'asc' } })).map((e) => e.reason),
    );
    expect(reasons).toEqual([
      PackageEntryReason.attended,
      PackageEntryReason.attendance_undone,
      PackageEntryReason.attended,
    ]);
  });

  it('never debits a no-show or a cancelled appointment', async () => {
    await buy(4, '2027-01-02');
    await mark(await pastAppointment(), Attendance.noShow);
    const cancelled = await pastAppointment(AppointmentStatus.cancelled);
    expect((await mark(cancelled, Attendance.attended)).ok).toBe(false);
    expect(await used()).toEqual([['Pacote 4 sessões', 0]]);
  });

  it('moves to the next package when the oldest is used up, and stops when none is open', async () => {
    await buy(1, '2027-01-02');
    await buy(4, '2027-01-10');
    await mark(await pastAppointment(), Attendance.attended);
    await mark(await pastAppointment(), Attendance.attended);
    expect(await used()).toEqual([
      ['Pacote 1 sessões', 1],
      ['Pacote 4 sessões', 1],
    ]);
  });

  it('marks attendance normally for a client without a package', async () => {
    const id = await pastAppointment();
    expect((await mark(id, Attendance.attended)).ok).toBe(true);
    expect(await inTenant((tx) => tx.packageEntry.count())).toBe(0);
  });
});

describe('manual adjustment', () => {
  it('moves the count by one with a reason, within 0 and the package size', async () => {
    const pkg = await buy(2, '2027-01-02');
    const adjust = (delta: 1 | -1) =>
      inTenant((tx) =>
        adjustPackage(tx, { packageId: pkg.id, delta, reason: PackageEntryReason.courtesy }),
      );
    expect(await adjust(-1)).toEqual({ ok: false, error: PackageError.belowZero });
    expect((await adjust(1)).ok).toBe(true);
    expect((await adjust(1)).ok).toBe(true);
    expect(await adjust(1)).toEqual({ ok: false, error: PackageError.full });
    expect((await adjust(-1)).ok).toBe(true);
    expect(await used()).toEqual([['Pacote 2 sessões', 1]]);
  });

  it('refuses an unknown package', async () => {
    await buy(2, '2027-01-02');
    const result = await inTenant((tx) =>
      adjustPackage(tx, {
        packageId: randomUUID(),
        delta: 1,
        reason: PackageEntryReason.correction,
      }),
    );
    expect(result).toEqual({ ok: false, error: PackageError.notFound });
  });
});
